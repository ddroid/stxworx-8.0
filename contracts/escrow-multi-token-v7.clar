;; ========================================================================
;; Freelance Escrow v4.0 - Multi-Token Support (STX + sBTC)
;; Admin Edge Cases: Pause, Dynamic Fees, Dispute Resolution,
;; Force Release/Refund, sBTC Recovery, Milestone Reset
;; ========================================================================

;; ======================== TRAITS ========================

(define-trait sip010-ft-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
  ))

;; ======================== CONSTANTS ========================

;; Timeouts (in burn blocks, ~10 min each)
(define-constant REFUND-TIMEOUT u144)           ;; ~24 hours
(define-constant FORCE-RELEASE-TIMEOUT u144)    ;; ~24 hours after milestone completion
(define-constant ABANDON-TIMEOUT u1008)         ;; ~7 days

;; Fee cap
(define-constant MAX-FEE-RATE u2000)            ;; 20% max (2000 basis points)
(define-constant MAX-MILESTONES u4)

;; Token types
(define-constant TOKEN-STX u0)
(define-constant TOKEN-SBTC u1)
(define-constant TOKEN-USDCX u2)

;; Dispute statuses
(define-constant DISPUTE-STATUS-OPEN u1)
(define-constant DISPUTE-STATUS-RESOLVED u2)

;; Error codes
(define-constant ERR-NOT-CLIENT (err u100))
(define-constant ERR-NOT-FREELANCER (err u101))
(define-constant ERR-PROJECT-NOT-FOUND (err u102))
(define-constant ERR-INVALID-MILESTONE (err u103))
(define-constant ERR-NOT-COMPLETE (err u105))
(define-constant ERR-ALREADY-RELEASED (err u106))
(define-constant ERR-INVALID-AMOUNT (err u108))
(define-constant ERR-REFUND-NOT-ALLOWED (err u111))
(define-constant ERR-ALREADY-REFUNDED (err u112))
(define-constant ERR-NOT-OWNER (err u113))
(define-constant ERR-TOO-MANY-MILESTONES (err u114))
(define-constant ERR-ALREADY-COMPLETE (err u116))
(define-constant ERR-INVALID-TOKEN (err u117))
(define-constant ERR-INSUFFICIENT-BALANCE (err u118))
(define-constant ERR-CONTRACT-PAUSED (err u119))
(define-constant ERR-FEE-TOO-HIGH (err u120))
(define-constant ERR-PROJECT-NOT-ABANDONED (err u122))
(define-constant ERR-NO-SURPLUS (err u123))
(define-constant ERR-FORCE-RELEASE-TOO-EARLY (err u125))
(define-constant ERR-DISPUTE-ALREADY-OPEN (err u126))
(define-constant ERR-NOT-PROJECT-PARTY (err u127))
(define-constant ERR-NO-OPEN-DISPUTE (err u128))
(define-constant ERR-NO-CHANGE (err u129))
(define-constant ERR-ACTIVE-ESCROWS (err u130))
(define-constant ERR-DISPUTE-ACTIVE (err u131))

;; ======================== DATA VARIABLES ========================

(define-data-var project-counter uint u0)
(define-data-var treasury principal 'STTCT2FCG2AE0T2Q70KBA1GDM4VN14FRW5A1NBR0)
(define-data-var contract-owner principal tx-sender)
(define-data-var proposed-owner (optional principal) none)
(define-data-var fee-rate uint u2000)              ;; 20% default (2000 basis points)
(define-data-var contract-paused bool false)
(define-data-var total-committed-sbtc uint u0)
(define-data-var total-committed-usdcx uint u0)
(define-data-var sbtc-contract (optional principal) none)
(define-data-var usdcx-contract (optional principal) none)
(define-data-var dispute-counter uint u0)

;; ======================== DATA MAPS ========================

(define-map projects uint
  {
    client: principal,
    freelancer: principal,
    total-amount: uint,
    fee-paid: uint,
    num-milestones: uint,
    refunded: bool,
    created-at: uint,
    token-type: uint
  })

(define-map milestones {project-id: uint, milestone-num: uint}
  {
    amount: uint,
    complete: bool,
    released: bool,
    completed-at: uint
  })

(define-map project-last-activity uint uint)

(define-map disputes {project-id: uint, milestone-num: uint}
  {
    filed-by: principal,
    status: uint,
    resolved-in-favor-of: (optional principal),
    filed-at: uint,
    resolved-at: uint
  })

;; ======================== PRIVATE HELPERS ========================

(define-private (assert-not-paused)
  (ok (asserts! (not (var-get contract-paused)) ERR-CONTRACT-PAUSED)))

(define-private (assert-is-owner)
  (ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)))

(define-private (assert-valid-sbtc (token <sip010-ft-trait>))
  (match (var-get sbtc-contract)
    expected (ok (asserts! (is-eq (contract-of token) expected) ERR-INVALID-TOKEN))
    ERR-INVALID-TOKEN))

(define-private (assert-valid-usdcx (token <sip010-ft-trait>))
  (match (var-get usdcx-contract)
    expected (ok (asserts! (is-eq (contract-of token) expected) ERR-INVALID-TOKEN))
    ERR-INVALID-TOKEN))

(define-private (update-last-activity (project-id uint))
  (map-set project-last-activity project-id burn-block-height))

(define-private (has-activity (project-id uint))
  (or (or (is-milestone-active project-id u1)
          (is-milestone-active project-id u2))
      (or (is-milestone-active project-id u3)
          (is-milestone-active project-id u4))))

(define-private (is-milestone-active (project-id uint) (milestone-num uint))
  (match (map-get? milestones {project-id: project-id, milestone-num: milestone-num})
    m (or (get complete m) (get released m))
    false))

(define-private (calc-released (project-id uint))
  (+ (get-milestone-released project-id u1)
     (+ (get-milestone-released project-id u2)
        (+ (get-milestone-released project-id u3)
           (get-milestone-released project-id u4)))))

(define-private (get-milestone-released (project-id uint) (milestone-num uint))
  (match (map-get? milestones {project-id: project-id, milestone-num: milestone-num})
    m (if (get released m) (get amount m) u0)
    u0))

(define-private (count-milestone-complete (project-id uint))
  (+ (if (is-milestone-complete-check project-id u1) u1 u0)
     (+ (if (is-milestone-complete-check project-id u2) u1 u0)
        (+ (if (is-milestone-complete-check project-id u3) u1 u0)
           (if (is-milestone-complete-check project-id u4) u1 u0)))))

(define-private (is-milestone-complete-check (project-id uint) (milestone-num uint))
  (match (map-get? milestones {project-id: project-id, milestone-num: milestone-num})
    m (get complete m)
    false))

(define-private (count-milestone-released (project-id uint))
  (+ (if (is-milestone-released-check project-id u1) u1 u0)
     (+ (if (is-milestone-released-check project-id u2) u1 u0)
        (+ (if (is-milestone-released-check project-id u3) u1 u0)
           (if (is-milestone-released-check project-id u4) u1 u0)))))

(define-private (is-milestone-released-check (project-id uint) (milestone-num uint))
  (match (map-get? milestones {project-id: project-id, milestone-num: milestone-num})
    m (get released m)
    false))

(define-private (is-dispute-open (project-id uint) (milestone-num uint))
  (match (map-get? disputes {project-id: project-id, milestone-num: milestone-num})
    d (is-eq (get status d) DISPUTE-STATUS-OPEN)
    false))

(define-private (has-open-dispute (project-id uint))
  (or (or (is-dispute-open project-id u1)
          (is-dispute-open project-id u2))
      (or (is-dispute-open project-id u3)
          (is-dispute-open project-id u4))))

(define-private (close-dispute-if-open (project-id uint) (milestone-num uint) (favor principal))
  (match (map-get? disputes {project-id: project-id, milestone-num: milestone-num})
    d (if (is-eq (get status d) DISPUTE-STATUS-OPEN)
        (map-set disputes {project-id: project-id, milestone-num: milestone-num}
          (merge d {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some favor), resolved-at: burn-block-height}))
        true)
    true))

;; ======================== ADMIN: CONFIGURATION ========================

(define-public (set-treasury (new principal))
  (begin
    (try! (assert-is-owner))
    (asserts! (not (is-eq new (var-get treasury))) ERR-NO-CHANGE)
    (var-set treasury new)
    (print {event: "treasury-updated", new-treasury: new})
    (ok true)))

(define-public (propose-ownership (new-owner principal))
  (begin
    (try! (assert-is-owner))
    (asserts! (not (is-eq new-owner (var-get contract-owner))) ERR-NO-CHANGE)
    (var-set proposed-owner (some new-owner))
    (print {event: "ownership-proposed", proposed-owner: new-owner})
    (ok true)))

(define-public (accept-ownership)
  (let ((proposed (unwrap! (var-get proposed-owner) ERR-NOT-OWNER)))
    (asserts! (is-eq tx-sender proposed) ERR-NOT-OWNER)
    (var-set contract-owner tx-sender)
    (var-set proposed-owner none)
    (print {event: "ownership-transferred", new-owner: tx-sender})
    (ok true)))

(define-public (set-paused (paused bool))
  (begin
    (try! (assert-is-owner))
    (asserts! (not (is-eq paused (var-get contract-paused))) ERR-NO-CHANGE)
    (var-set contract-paused paused)
    (print {event: "contract-paused-updated", paused: paused})
    (ok true)))

(define-public (set-fee-rate (new-rate uint))
  (begin
    (try! (assert-is-owner))
    (asserts! (not (is-eq new-rate (var-get fee-rate))) ERR-NO-CHANGE)
    (asserts! (<= new-rate MAX-FEE-RATE) ERR-FEE-TOO-HIGH)
    (var-set fee-rate new-rate)
    (print {event: "fee-rate-updated", new-rate: new-rate})
    (ok true)))

(define-public (set-sbtc-contract (contract principal))
  (begin
    (try! (assert-is-owner))
    (asserts! (is-eq (var-get total-committed-sbtc) u0) ERR-ACTIVE-ESCROWS)
    (var-set sbtc-contract (some contract))
    (print {event: "sbtc-contract-updated", contract: contract})
    (ok true)))

(define-public (set-usdcx-contract (contract principal))
  (begin
    (try! (assert-is-owner))
    (asserts! (is-eq (var-get total-committed-usdcx) u0) ERR-ACTIVE-ESCROWS)
    (var-set usdcx-contract (some contract))
    (print {event: "usdcx-contract-updated", contract: contract})
    (ok true)))

;; ======================== ADMIN: DISPUTE RESOLUTION ========================
;; NOTE: Admin functions intentionally bypass the pause mechanism to allow
;; incident response, dispute resolution, and fund recovery while paused.

(define-public (admin-resolve-dispute-stx (project-id uint) (milestone-num uint) (release-to-freelancer bool))
  (begin
    (try! (assert-is-owner))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (dispute (unwrap! (map-get? disputes {project-id: project-id, milestone-num: milestone-num}) ERR-NO-OPEN-DISPUTE))
      (amount (get amount milestone))
      (recipient (if release-to-freelancer (get freelancer project) (get client project)))
    )
      (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
      (asserts! (is-eq (get status dispute) DISPUTE-STATUS-OPEN) ERR-NO-OPEN-DISPUTE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)

      (try! (as-contract? ((with-stx amount)) (try! (stx-transfer? amount tx-sender recipient))))
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))
      (map-set disputes {project-id: project-id, milestone-num: milestone-num}
        (merge dispute {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some recipient), resolved-at: burn-block-height}))
      (update-last-activity project-id)
      (print {event: "dispute-resolved", project-id: project-id, milestone: milestone-num, released-to-freelancer: release-to-freelancer, amount: amount, token: "STX"})
      (ok amount))))

(define-public (admin-resolve-dispute-sbtc (project-id uint) (milestone-num uint) (release-to-freelancer bool) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-sbtc sbtc-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (dispute (unwrap! (map-get? disputes {project-id: project-id, milestone-num: milestone-num}) ERR-NO-OPEN-DISPUTE))
      (amount (get amount milestone))
      (recipient (if release-to-freelancer (get freelancer project) (get client project)))
    )
      (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
      (asserts! (is-eq (get status dispute) DISPUTE-STATUS-OPEN) ERR-NO-OPEN-DISPUTE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)

      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer amount tx-sender recipient none))))
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))
      (map-set disputes {project-id: project-id, milestone-num: milestone-num}
        (merge dispute {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some recipient), resolved-at: burn-block-height}))
      (var-set total-committed-sbtc (- (var-get total-committed-sbtc) amount))
      (update-last-activity project-id)
      (print {event: "dispute-resolved", project-id: project-id, milestone: milestone-num, released-to-freelancer: release-to-freelancer, amount: amount, token: "sBTC"})
      (ok amount))))

(define-public (admin-resolve-dispute-usdcx (project-id uint) (milestone-num uint) (release-to-freelancer bool) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-usdcx usdcx-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (dispute (unwrap! (map-get? disputes {project-id: project-id, milestone-num: milestone-num}) ERR-NO-OPEN-DISPUTE))
      (amount (get amount milestone))
      (recipient (if release-to-freelancer (get freelancer project) (get client project)))
    )
      (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
      (asserts! (is-eq (get status dispute) DISPUTE-STATUS-OPEN) ERR-NO-OPEN-DISPUTE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)

      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer amount tx-sender recipient none))))
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))
      (map-set disputes {project-id: project-id, milestone-num: milestone-num}
        (merge dispute {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some recipient), resolved-at: burn-block-height}))
      (var-set total-committed-usdcx (- (var-get total-committed-usdcx) amount))
      (update-last-activity project-id)
      (print {event: "dispute-resolved", project-id: project-id, milestone: milestone-num, released-to-freelancer: release-to-freelancer, amount: amount, token: "USDCx"})
      (ok amount))))

;; ======================== ADMIN: FORCE ACTIONS ========================

(define-public (admin-force-release-stx (project-id uint) (milestone-num uint))
  (begin
    (try! (assert-is-owner))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
      (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
      (asserts! (get complete milestone) ERR-NOT-COMPLETE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (>= (- burn-block-height (get completed-at milestone)) FORCE-RELEASE-TIMEOUT) ERR-FORCE-RELEASE-TOO-EARLY)

      ;; Fee already collected at creation - send full stored amount to freelancer
      (try! (as-contract? ((with-stx amount)) (try! (stx-transfer? amount tx-sender (get freelancer project)))))
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))
      ;; Auto-close any open dispute (admin chose to release to freelancer)
      (close-dispute-if-open project-id milestone-num (get freelancer project))
      (update-last-activity project-id)
      (print {event: "force-released", project-id: project-id, milestone: milestone-num, amount: amount, token: "STX"})
      (ok amount))))

(define-public (admin-force-release-sbtc (project-id uint) (milestone-num uint) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-sbtc sbtc-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
      (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
      (asserts! (get complete milestone) ERR-NOT-COMPLETE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (>= (- burn-block-height (get completed-at milestone)) FORCE-RELEASE-TIMEOUT) ERR-FORCE-RELEASE-TOO-EARLY)

      ;; Fee already collected at creation - send full stored amount to freelancer
      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer amount tx-sender (get freelancer project) none))))
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))
      ;; Auto-close any open dispute (admin chose to release to freelancer)
      (close-dispute-if-open project-id milestone-num (get freelancer project))
      (var-set total-committed-sbtc (- (var-get total-committed-sbtc) amount))
      (update-last-activity project-id)
      (print {event: "force-released", project-id: project-id, milestone: milestone-num, amount: amount, token: "sBTC"})
      (ok amount))))

(define-public (admin-force-release-usdcx (project-id uint) (milestone-num uint) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-usdcx usdcx-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
      (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
      (asserts! (get complete milestone) ERR-NOT-COMPLETE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (>= (- burn-block-height (get completed-at milestone)) FORCE-RELEASE-TIMEOUT) ERR-FORCE-RELEASE-TOO-EARLY)

      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer amount tx-sender (get freelancer project) none))))
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))
      (close-dispute-if-open project-id milestone-num (get freelancer project))
      (var-set total-committed-usdcx (- (var-get total-committed-usdcx) amount))
      (update-last-activity project-id)
      (print {event: "force-released", project-id: project-id, milestone: milestone-num, amount: amount, token: "USDCx"})
      (ok amount))))

(define-public (admin-force-refund-stx (project-id uint))
  (begin
    (try! (assert-is-owner))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (last-activity (default-to (get created-at project) (map-get? project-last-activity project-id)))
      (total (get total-amount project))
      (released-total (calc-released project-id))
      (refund-amount (- total released-total))
    )
      (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (> refund-amount u0) ERR-INVALID-AMOUNT)
      (asserts! (>= (- burn-block-height last-activity) ABANDON-TIMEOUT) ERR-PROJECT-NOT-ABANDONED)

      (try! (as-contract? ((with-stx refund-amount)) (try! (stx-transfer? refund-amount tx-sender (get client project)))))
      (map-set projects project-id (merge project {refunded: true}))
      ;; Close all open disputes on the abandoned project
      (close-dispute-if-open project-id u1 (get client project))
      (close-dispute-if-open project-id u2 (get client project))
      (close-dispute-if-open project-id u3 (get client project))
      (close-dispute-if-open project-id u4 (get client project))
      (update-last-activity project-id)
      (print {event: "force-refund", project-id: project-id, refund-amount: refund-amount, client: (get client project), token: "STX"})
      (ok refund-amount))))

(define-public (admin-force-refund-sbtc (project-id uint) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-sbtc sbtc-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (last-activity (default-to (get created-at project) (map-get? project-last-activity project-id)))
      (total (get total-amount project))
      (released-total (calc-released project-id))
      (refund-amount (- total released-total))
    )
      (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (> refund-amount u0) ERR-INVALID-AMOUNT)
      (asserts! (>= (- burn-block-height last-activity) ABANDON-TIMEOUT) ERR-PROJECT-NOT-ABANDONED)

      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer refund-amount tx-sender (get client project) none))))
      (map-set projects project-id (merge project {refunded: true}))
      ;; Close all open disputes on the abandoned project
      (close-dispute-if-open project-id u1 (get client project))
      (close-dispute-if-open project-id u2 (get client project))
      (close-dispute-if-open project-id u3 (get client project))
      (close-dispute-if-open project-id u4 (get client project))
      (var-set total-committed-sbtc (- (var-get total-committed-sbtc) refund-amount))
      (update-last-activity project-id)
      (print {event: "force-refund", project-id: project-id, refund-amount: refund-amount, client: (get client project), token: "sBTC"})
      (ok refund-amount))))

(define-public (admin-force-refund-usdcx (project-id uint) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-usdcx usdcx-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (last-activity (default-to (get created-at project) (map-get? project-last-activity project-id)))
      (total (get total-amount project))
      (released-total (calc-released project-id))
      (refund-amount (- total released-total))
    )
      (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (> refund-amount u0) ERR-INVALID-AMOUNT)
      (asserts! (>= (- burn-block-height last-activity) ABANDON-TIMEOUT) ERR-PROJECT-NOT-ABANDONED)

      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer refund-amount tx-sender (get client project) none))))
      (map-set projects project-id (merge project {refunded: true}))
      (close-dispute-if-open project-id u1 (get client project))
      (close-dispute-if-open project-id u2 (get client project))
      (close-dispute-if-open project-id u3 (get client project))
      (close-dispute-if-open project-id u4 (get client project))
      (var-set total-committed-usdcx (- (var-get total-committed-usdcx) refund-amount))
      (update-last-activity project-id)
      (print {event: "force-refund", project-id: project-id, refund-amount: refund-amount, client: (get client project), token: "USDCx"})
      (ok refund-amount))))

;; ======================== ADMIN: RECOVERY & PROTECTION ========================

(define-public (admin-recover-sbtc (amount uint) (recipient principal) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-sbtc sbtc-token))
    (let (
      (balance (unwrap! (contract-call? sbtc-token get-balance current-contract) ERR-INSUFFICIENT-BALANCE))
      (committed (var-get total-committed-sbtc))
    )
      (asserts! (> balance committed) ERR-NO-SURPLUS)
      (let ((surplus (- balance committed)))
        (asserts! (<= amount surplus) ERR-NO-SURPLUS)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer amount tx-sender recipient none))))
        (print {event: "sbtc-recovered", amount: amount, recipient: recipient})
        (ok amount)))))

(define-public (admin-recover-usdcx (amount uint) (recipient principal) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-is-owner))
    (try! (assert-valid-usdcx usdcx-token))
    (let (
      (balance (unwrap! (contract-call? usdcx-token get-balance current-contract) ERR-INSUFFICIENT-BALANCE))
      (committed (var-get total-committed-usdcx))
    )
      (asserts! (> balance committed) ERR-NO-SURPLUS)
      (let ((surplus (- balance committed)))
        (asserts! (<= amount surplus) ERR-NO-SURPLUS)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer amount tx-sender recipient none))))
        (print {event: "usdcx-recovered", amount: amount, recipient: recipient})
        (ok amount)))))

(define-public (admin-reset-milestone (project-id uint) (milestone-num uint))
  (begin
    (try! (assert-is-owner))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
    )
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {complete: false, completed-at: u0}))
      ;; Clear any existing dispute so a new one can be filed after rework
      (map-delete disputes {project-id: project-id, milestone-num: milestone-num})
      (update-last-activity project-id)
      (print {event: "milestone-reset", project-id: project-id, milestone: milestone-num})
      (ok true))))

;; ======================== CORE: STX ========================

(define-public (create-project-stx
    (freelancer principal)
    (m1 uint) (m2 uint) (m3 uint) (m4 uint))
  (begin
    (try! (assert-not-paused))
    (let (
      (id (+ (var-get project-counter) u1))
      (current-fee-rate (var-get fee-rate))
      (total (+ m1 (+ m2 (+ m3 m4))))
      (num-milestones (+ (if (> m1 u0) u1 u0)
                         (+ (if (> m2 u0) u1 u0)
                            (+ (if (> m3 u0) u1 u0)
                               (if (> m4 u0) u1 u0)))))
      ;; Per-milestone fee deductions (ensures sum consistency)
      (m1-fee (if (> m1 u0) (/ (* m1 current-fee-rate) u10000) u0))
      (m2-fee (if (> m2 u0) (/ (* m2 current-fee-rate) u10000) u0))
      (m3-fee (if (> m3 u0) (/ (* m3 current-fee-rate) u10000) u0))
      (m4-fee (if (> m4 u0) (/ (* m4 current-fee-rate) u10000) u0))
      (total-fee (+ m1-fee (+ m2-fee (+ m3-fee m4-fee))))
      (net-escrow (- total total-fee))
    )
      (asserts! (> total u0) ERR-INVALID-AMOUNT)
      (asserts! (not (is-eq tx-sender freelancer)) ERR-NOT-CLIENT)
      (asserts! (and (>= num-milestones u2) (<= num-milestones MAX-MILESTONES)) ERR-TOO-MANY-MILESTONES)

      ;; Transfer full amount from client into contract
      (try! (stx-transfer? total tx-sender current-contract))
      ;; Send platform fee to treasury immediately
      (if (> total-fee u0)
        (try! (as-contract? ((with-stx total-fee)) (try! (stx-transfer? total-fee tx-sender (var-get treasury)))))
        true)

      (var-set project-counter id)
      (map-set projects id {
        client: tx-sender,
        freelancer: freelancer,
        total-amount: net-escrow,
        fee-paid: total-fee,
        num-milestones: num-milestones,
        refunded: false,
        created-at: burn-block-height,
        token-type: TOKEN-STX
      })

      ;; Store milestones with NET amounts (fee already deducted)
      (if (> m1 u0) (map-set milestones {project-id: id, milestone-num: u1} {amount: (- m1 m1-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m2 u0) (map-set milestones {project-id: id, milestone-num: u2} {amount: (- m2 m2-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m3 u0) (map-set milestones {project-id: id, milestone-num: u3} {amount: (- m3 m3-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m4 u0) (map-set milestones {project-id: id, milestone-num: u4} {amount: (- m4 m4-fee), complete: false, released: false, completed-at: u0}) true)

      (update-last-activity id)
      (print {
        event: "project-created",
        project-id: id,
        client: tx-sender,
        freelancer: freelancer,
        gross-amount: total,
        net-escrow: net-escrow,
        fee-collected: total-fee,
        num-milestones: num-milestones,
        token: "STX"
      })
      (ok id))))

(define-public (create-project-sbtc
    (freelancer principal)
    (m1 uint) (m2 uint) (m3 uint) (m4 uint)
    (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-sbtc sbtc-token))
    (let (
      (id (+ (var-get project-counter) u1))
      (current-fee-rate (var-get fee-rate))
      (total (+ m1 (+ m2 (+ m3 m4))))
      (num-milestones (+ (if (> m1 u0) u1 u0)
                         (+ (if (> m2 u0) u1 u0)
                            (+ (if (> m3 u0) u1 u0)
                               (if (> m4 u0) u1 u0)))))
      (m1-fee (if (> m1 u0) (/ (* m1 current-fee-rate) u10000) u0))
      (m2-fee (if (> m2 u0) (/ (* m2 current-fee-rate) u10000) u0))
      (m3-fee (if (> m3 u0) (/ (* m3 current-fee-rate) u10000) u0))
      (m4-fee (if (> m4 u0) (/ (* m4 current-fee-rate) u10000) u0))
      (total-fee (+ m1-fee (+ m2-fee (+ m3-fee m4-fee))))
      (net-escrow (- total total-fee))
    )
      (asserts! (> total u0) ERR-INVALID-AMOUNT)
      (asserts! (not (is-eq tx-sender freelancer)) ERR-NOT-CLIENT)
      (asserts! (and (>= num-milestones u2) (<= num-milestones MAX-MILESTONES)) ERR-TOO-MANY-MILESTONES)

      ;; Transfer full sBTC amount from client into contract
      (try! (contract-call? sbtc-token transfer total tx-sender current-contract none))
      ;; Send platform fee to treasury immediately
      (if (> total-fee u0)
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer total-fee tx-sender (var-get treasury) none))))
        true)

      (var-set project-counter id)
      (map-set projects id {
        client: tx-sender,
        freelancer: freelancer,
        total-amount: net-escrow,
        fee-paid: total-fee,
        num-milestones: num-milestones,
        refunded: false,
        created-at: burn-block-height,
        token-type: TOKEN-SBTC
      })

      (if (> m1 u0) (map-set milestones {project-id: id, milestone-num: u1} {amount: (- m1 m1-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m2 u0) (map-set milestones {project-id: id, milestone-num: u2} {amount: (- m2 m2-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m3 u0) (map-set milestones {project-id: id, milestone-num: u3} {amount: (- m3 m3-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m4 u0) (map-set milestones {project-id: id, milestone-num: u4} {amount: (- m4 m4-fee), complete: false, released: false, completed-at: u0}) true)

      (var-set total-committed-sbtc (+ (var-get total-committed-sbtc) net-escrow))
      (update-last-activity id)
      (print {
        event: "project-created",
        project-id: id,
        client: tx-sender,
        freelancer: freelancer,
        gross-amount: total,
        net-escrow: net-escrow,
        fee-collected: total-fee,
        num-milestones: num-milestones,
        token: "sBTC"
      })
      (ok id))))

(define-public (create-project-usdcx
    (freelancer principal)
    (m1 uint) (m2 uint) (m3 uint) (m4 uint)
    (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-usdcx usdcx-token))
    (let (
      (id (+ (var-get project-counter) u1))
      (current-fee-rate (var-get fee-rate))
      (total (+ m1 (+ m2 (+ m3 m4))))
      (num-milestones (+ (if (> m1 u0) u1 u0)
                         (+ (if (> m2 u0) u1 u0)
                            (+ (if (> m3 u0) u1 u0)
                               (if (> m4 u0) u1 u0)))))
      (m1-fee (if (> m1 u0) (/ (* m1 current-fee-rate) u10000) u0))
      (m2-fee (if (> m2 u0) (/ (* m2 current-fee-rate) u10000) u0))
      (m3-fee (if (> m3 u0) (/ (* m3 current-fee-rate) u10000) u0))
      (m4-fee (if (> m4 u0) (/ (* m4 current-fee-rate) u10000) u0))
      (total-fee (+ m1-fee (+ m2-fee (+ m3-fee m4-fee))))
      (net-escrow (- total total-fee))
    )
      (asserts! (> total u0) ERR-INVALID-AMOUNT)
      (asserts! (not (is-eq tx-sender freelancer)) ERR-NOT-CLIENT)
      (asserts! (and (>= num-milestones u2) (<= num-milestones MAX-MILESTONES)) ERR-TOO-MANY-MILESTONES)

      ;; Transfer full USDCx amount from client into contract
      (try! (contract-call? usdcx-token transfer total tx-sender current-contract none))
      ;; Send platform fee to treasury immediately
      (if (> total-fee u0)
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer total-fee tx-sender (var-get treasury) none))))
        true)

      (var-set project-counter id)
      (map-set projects id {
        client: tx-sender,
        freelancer: freelancer,
        total-amount: net-escrow,
        fee-paid: total-fee,
        num-milestones: num-milestones,
        refunded: false,
        created-at: burn-block-height,
        token-type: TOKEN-USDCX
      })

      (if (> m1 u0) (map-set milestones {project-id: id, milestone-num: u1} {amount: (- m1 m1-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m2 u0) (map-set milestones {project-id: id, milestone-num: u2} {amount: (- m2 m2-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m3 u0) (map-set milestones {project-id: id, milestone-num: u3} {amount: (- m3 m3-fee), complete: false, released: false, completed-at: u0}) true)
      (if (> m4 u0) (map-set milestones {project-id: id, milestone-num: u4} {amount: (- m4 m4-fee), complete: false, released: false, completed-at: u0}) true)

      (var-set total-committed-usdcx (+ (var-get total-committed-usdcx) net-escrow))
      (update-last-activity id)
      (print {
        event: "project-created",
        project-id: id,
        client: tx-sender,
        freelancer: freelancer,
        gross-amount: total,
        net-escrow: net-escrow,
        fee-collected: total-fee,
        num-milestones: num-milestones,
        token: "USDCx"
      })
      (ok id))))

;; ======================== SHARED ========================

(define-public (complete-milestone (project-id uint) (milestone-num uint))
  (begin
    (try! (assert-not-paused))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
    )
      (asserts! (is-eq tx-sender (get freelancer project)) ERR-NOT-FREELANCER)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (not (get complete milestone)) ERR-ALREADY-COMPLETE)
      (asserts! (not (is-dispute-open project-id milestone-num)) ERR-DISPUTE-ACTIVE)

      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {complete: true, completed-at: burn-block-height}))

      (update-last-activity project-id)
      (print {
        event: "milestone-completed",
        project-id: project-id,
        milestone: milestone-num,
        freelancer: tx-sender
      })
      (ok true))))

;; ======================== DISPUTES ========================

(define-public (file-dispute (project-id uint) (milestone-num uint))
  (begin
    (try! (assert-not-paused))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
    )
      (asserts! (or (is-eq tx-sender (get client project)) (is-eq tx-sender (get freelancer project))) ERR-NOT-PROJECT-PARTY)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-none (map-get? disputes {project-id: project-id, milestone-num: milestone-num})) ERR-DISPUTE-ALREADY-OPEN)

      (var-set dispute-counter (+ (var-get dispute-counter) u1))
      (map-set disputes {project-id: project-id, milestone-num: milestone-num}
        {
          filed-by: tx-sender,
          status: DISPUTE-STATUS-OPEN,
          resolved-in-favor-of: none,
          filed-at: burn-block-height,
          resolved-at: u0
        })
      (update-last-activity project-id)
      (print {event: "dispute-filed", project-id: project-id, milestone: milestone-num, filed-by: tx-sender})
      (ok true))))

;; ======================== RELEASE ========================

(define-public (release-milestone-stx (project-id uint) (milestone-num uint))
  (begin
    (try! (assert-not-paused))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)
      (asserts! (get complete milestone) ERR-NOT-COMPLETE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)

      ;; Fee already collected at creation - send full stored amount to freelancer
      (try! (as-contract? ((with-stx amount)) (try! (stx-transfer? amount tx-sender (get freelancer project)))))

      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))

      ;; Auto-close any open dispute on this milestone (client chose to pay)
      (match (map-get? disputes {project-id: project-id, milestone-num: milestone-num})
        d (if (is-eq (get status d) DISPUTE-STATUS-OPEN)
            (map-set disputes {project-id: project-id, milestone-num: milestone-num}
              (merge d {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some (get freelancer project)), resolved-at: burn-block-height}))
            true)
        true)

      (update-last-activity project-id)
      (print {
        event: "milestone-released",
        project-id: project-id,
        milestone: milestone-num,
        amount: amount,
        token: "STX"
      })
      (ok amount))))

(define-public (release-milestone-sbtc (project-id uint) (milestone-num uint) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-sbtc sbtc-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)
      (asserts! (get complete milestone) ERR-NOT-COMPLETE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)

      ;; Fee already collected at creation - send full stored amount to freelancer
      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer amount tx-sender (get freelancer project) none))))

      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))

      ;; Auto-close any open dispute on this milestone (client chose to pay)
      (match (map-get? disputes {project-id: project-id, milestone-num: milestone-num})
        d (if (is-eq (get status d) DISPUTE-STATUS-OPEN)
            (map-set disputes {project-id: project-id, milestone-num: milestone-num}
              (merge d {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some (get freelancer project)), resolved-at: burn-block-height}))
            true)
        true)

      (var-set total-committed-sbtc (- (var-get total-committed-sbtc) amount))
      (update-last-activity project-id)
      (print {
        event: "milestone-released",
        project-id: project-id,
        milestone: milestone-num,
        amount: amount,
        token: "sBTC"
      })
      (ok amount))))

(define-public (release-milestone-usdcx (project-id uint) (milestone-num uint) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-usdcx usdcx-token))
    (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
      (asserts! (> amount u0) ERR-INVALID-AMOUNT)
      (asserts! (get complete milestone) ERR-NOT-COMPLETE)
      (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)

      ;; Fee already collected at creation - send full stored amount to freelancer
      (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer amount tx-sender (get freelancer project) none))))

      (map-set milestones {project-id: project-id, milestone-num: milestone-num}
        (merge milestone {released: true}))

      ;; Auto-close any open dispute on this milestone (client chose to pay)
      (match (map-get? disputes {project-id: project-id, milestone-num: milestone-num})
        d (if (is-eq (get status d) DISPUTE-STATUS-OPEN)
            (map-set disputes {project-id: project-id, milestone-num: milestone-num}
              (merge d {status: DISPUTE-STATUS-RESOLVED, resolved-in-favor-of: (some (get freelancer project)), resolved-at: burn-block-height}))
            true)
        true)

      (var-set total-committed-usdcx (- (var-get total-committed-usdcx) amount))
      (update-last-activity project-id)
      (print {
        event: "milestone-released",
        project-id: project-id,
        milestone: milestone-num,
        amount: amount,
        token: "USDCx"
      })
      (ok amount))))

;; ======================== REFUND ========================

(define-public (request-full-refund-stx (project-id uint))
  (begin
    (try! (assert-not-paused))
    (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
      (asserts! (not (has-activity project-id)) ERR-REFUND-NOT-ALLOWED)
      (asserts! (not (has-open-dispute project-id)) ERR-DISPUTE-ACTIVE)

      (let ((total (get total-amount project)))
        (try! (as-contract? ((with-stx total)) (try! (stx-transfer? total tx-sender (get client project)))))
        (map-set projects project-id (merge project {refunded: true}))
        (update-last-activity project-id)
        (print {
          event: "full-refund",
          project-id: project-id,
          amount: total,
          client: (get client project),
          token: "STX"
        })
        (ok total)))))

(define-public (request-full-refund-sbtc (project-id uint) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-sbtc sbtc-token))
    (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
      (asserts! (not (has-activity project-id)) ERR-REFUND-NOT-ALLOWED)
      (asserts! (not (has-open-dispute project-id)) ERR-DISPUTE-ACTIVE)

      (let ((total (get total-amount project)))
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer total tx-sender (get client project) none))))
        (map-set projects project-id (merge project {refunded: true}))
        (var-set total-committed-sbtc (- (var-get total-committed-sbtc) total))
        (update-last-activity project-id)
        (print {
          event: "full-refund",
          project-id: project-id,
          amount: total,
          client: (get client project),
          token: "sBTC"
        })
        (ok total)))))

(define-public (request-full-refund-usdcx (project-id uint) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-usdcx usdcx-token))
    (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
      (asserts! (not (has-activity project-id)) ERR-REFUND-NOT-ALLOWED)
      (asserts! (not (has-open-dispute project-id)) ERR-DISPUTE-ACTIVE)

      (let ((total (get total-amount project)))
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer total tx-sender (get client project) none))))
        (map-set projects project-id (merge project {refunded: true}))
        (var-set total-committed-usdcx (- (var-get total-committed-usdcx) total))
        (update-last-activity project-id)
        (print {
          event: "full-refund",
          project-id: project-id,
          amount: total,
          client: (get client project),
          token: "USDCx"
        })
        (ok total)))))

(define-public (emergency-refund-stx (project-id uint))
  (begin
    (try! (assert-not-paused))
    (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
      (asserts! (>= (- burn-block-height (get created-at project)) REFUND-TIMEOUT) ERR-REFUND-NOT-ALLOWED)
      (asserts! (not (has-open-dispute project-id)) ERR-DISPUTE-ACTIVE)

      (let (
        (total (get total-amount project))
        (released-total (calc-released project-id))
        (refund-amount (- total released-total))
      )
        (asserts! (> refund-amount u0) ERR-REFUND-NOT-ALLOWED)
        (try! (as-contract? ((with-stx refund-amount)) (try! (stx-transfer? refund-amount tx-sender (get client project)))))
        (map-set projects project-id (merge project {refunded: true}))
        (update-last-activity project-id)
        (print {
          event: "emergency-refund",
          project-id: project-id,
          refund-amount: refund-amount,
          released-amount: released-total,
          client: (get client project),
          token: "STX"
        })
        (ok refund-amount)))))

(define-public (emergency-refund-sbtc (project-id uint) (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-sbtc sbtc-token))
    (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
      (asserts! (>= (- burn-block-height (get created-at project)) REFUND-TIMEOUT) ERR-REFUND-NOT-ALLOWED)
      (asserts! (not (has-open-dispute project-id)) ERR-DISPUTE-ACTIVE)

      (let (
        (total (get total-amount project))
        (released-total (calc-released project-id))
        (refund-amount (- total released-total))
      )
        (asserts! (> refund-amount u0) ERR-REFUND-NOT-ALLOWED)
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? sbtc-token transfer refund-amount tx-sender (get client project) none))))
        (map-set projects project-id (merge project {refunded: true}))
        (var-set total-committed-sbtc (- (var-get total-committed-sbtc) refund-amount))
        (update-last-activity project-id)
        (print {
          event: "emergency-refund",
          project-id: project-id,
          refund-amount: refund-amount,
          released-amount: released-total,
          client: (get client project),
          token: "sBTC"
        })
        (ok refund-amount)))))

(define-public (emergency-refund-usdcx (project-id uint) (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-not-paused))
    (try! (assert-valid-usdcx usdcx-token))
    (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get client project)) ERR-NOT-CLIENT)
      (asserts! (not (get refunded project)) ERR-ALREADY-REFUNDED)
      (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
      (asserts! (>= (- burn-block-height (get created-at project)) REFUND-TIMEOUT) ERR-REFUND-NOT-ALLOWED)
      (asserts! (not (has-open-dispute project-id)) ERR-DISPUTE-ACTIVE)

      (let (
        (total (get total-amount project))
        (released-total (calc-released project-id))
        (refund-amount (- total released-total))
      )
        (asserts! (> refund-amount u0) ERR-REFUND-NOT-ALLOWED)
        (try! (as-contract? ((with-all-assets-unsafe)) (try! (contract-call? usdcx-token transfer refund-amount tx-sender (get client project) none))))
        (map-set projects project-id (merge project {refunded: true}))
        (var-set total-committed-usdcx (- (var-get total-committed-usdcx) refund-amount))
        (update-last-activity project-id)
        (print {
          event: "emergency-refund",
          project-id: project-id,
          refund-amount: refund-amount,
          released-amount: released-total,
          client: (get client project),
          token: "USDCx"
        })
        (ok refund-amount)))))

;; ======================== READ-ONLY ========================

(define-read-only (get-project (id uint))
  (map-get? projects id))

(define-read-only (get-milestone (project-id uint) (milestone-num uint))
  (map-get? milestones {project-id: project-id, milestone-num: milestone-num}))

(define-read-only (get-project-count)
  (var-get project-counter))

(define-read-only (get-contract-balance-stx)
  (stx-get-balance current-contract))

(define-public (get-balance-sbtc (sbtc-token <sip010-ft-trait>))
  (begin
    (try! (assert-valid-sbtc sbtc-token))
    (contract-call? sbtc-token get-balance current-contract)))

(define-public (get-balance-usdcx (usdcx-token <sip010-ft-trait>))
  (begin
    (try! (assert-valid-usdcx usdcx-token))
    (contract-call? usdcx-token get-balance current-contract)))

(define-read-only (get-refundable (id uint))
  (match (map-get? projects id)
    project (if (get refunded project)
      (ok u0)
      (ok (- (get total-amount project) (calc-released id))))
    ERR-PROJECT-NOT-FOUND))

(define-read-only (get-treasury)
  (var-get treasury))

(define-read-only (get-contract-owner)
  (var-get contract-owner))

(define-read-only (get-token-name (token-type uint))
  (if (is-eq token-type TOKEN-STX)
    (ok "STX")
    (if (is-eq token-type TOKEN-SBTC)
      (ok "sBTC")
      (if (is-eq token-type TOKEN-USDCX)
        (ok "USDCx")
        ERR-INVALID-TOKEN))))

(define-read-only (get-fee-rate)
  (var-get fee-rate))

(define-read-only (is-paused)
  (var-get contract-paused))

(define-read-only (get-committed-sbtc)
  (var-get total-committed-sbtc))

(define-read-only (get-committed-usdcx)
  (var-get total-committed-usdcx))

(define-read-only (get-proposed-owner)
  (var-get proposed-owner))

(define-read-only (get-sbtc-contract)
  (var-get sbtc-contract))

(define-read-only (get-usdcx-contract)
  (var-get usdcx-contract))

(define-read-only (get-last-activity (id uint))
  (map-get? project-last-activity id))

(define-read-only (get-dispute (project-id uint) (milestone-num uint))
  (map-get? disputes {project-id: project-id, milestone-num: milestone-num}))

(define-read-only (get-dispute-count)
  (var-get dispute-counter))

(define-read-only (get-project-status-summary (project-id uint))
  (match (map-get? projects project-id)
    project
    (let (
      (released-amount (calc-released project-id))
      (refundable (if (get refunded project) u0 (- (get total-amount project) released-amount)))
    )
      (ok {
        milestones-complete: (count-milestone-complete project-id),
        milestones-released: (count-milestone-released project-id),
        total-amount: (get total-amount project),
        fee-paid: (get fee-paid project),
        released-amount: released-amount,
        refundable-amount: refundable,
        refunded: (get refunded project),
        age-blocks: (- burn-block-height (get created-at project)),
        last-activity-block: (default-to (get created-at project) (map-get? project-last-activity project-id)),
        token-type: (get token-type project)
      }))
    ERR-PROJECT-NOT-FOUND))
