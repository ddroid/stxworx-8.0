(define-trait sip010-ft-trait
  ((transfer (uint principal principal (optional (buff 34))) (response bool uint))
   (get-balance (principal) (response uint uint))))

(define-constant DAO-INSTANT-CUT u1000)
(define-constant DEFAULT-FEE-CLIENT u700)
(define-constant DEFAULT-FEE-FREELANCER u300)
(define-constant MAX-FEE-TOTAL u1500)
(define-constant REFUND-TIMEOUT u144)
(define-constant FORCE-RELEASE-TIMEOUT u144)
(define-constant ABANDON-TIMEOUT u1008)
(define-constant MAX-MILESTONES u4)

(define-constant TOKEN-STX u0)
(define-constant TOKEN-SBTC u1)
(define-constant TOKEN-USDCX u2)

(define-constant ERR-NOT-DAO (err u200))
(define-constant ERR-NOT-CLIENT (err u201))
(define-constant ERR-NOT-FREELANCER (err u202))
(define-constant ERR-INVALID-MS (err u203))
(define-constant ERR-INVALID-AMOUNT (err u204))
(define-constant ERR-CONTRACT-PAUSED (err u119))
(define-constant ERR-FEE-TOO-HIGH (err u120))
(define-constant ERR-DISPUTE-ACTIVE (err u131))

(define-data-var project-counter uint u0)
(define-data-var dao-wallet principal 'SP4RX4SP7XYEC9BSA6XJFA74Y45M3TQFH2RK8D3X)
(define-data-var dao-governor principal tx-sender)
(define-data-var paused bool false)
(define-data-var fee-client uint DEFAULT-FEE-CLIENT)
(define-data-var fee-freelancer uint DEFAULT-FEE-FREELANCER)

(define-map projects uint
  { client: principal,
    freelancer: principal,
    total-gross: uint,
    total-net: uint,
    dao-cut: uint,
    fee-client: uint,
    fee-freelancer: uint,
    ms-count: uint,
    token-type: uint,
    refunded: bool,
    created-at: uint })

(define-map milestones {project: uint, ms: uint}
  { amount: uint, complete: bool, released: bool, completed-at: uint })

(define-private (assert-dao)
  (ok (asserts! (is-eq tx-sender (var-get dao-governor)) ERR-NOT-DAO)))

(define-private (assert-not-paused)
  (ok (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED)))

(define-private (count-ms (m1 uint) (m2 uint) (m3 uint) (m4 uint))
  (+ (if (> m1 u0) u1 u0)
     (+ (if (> m2 u0) u1 u0)
        (+ (if (> m3 u0) u1 u0)
           (if (> m4 u0) u1 u0)))))

(define-public (set-dao-wallet (new principal))
  (begin
    (try! (assert-dao))
    (var-set dao-wallet new)
    (ok true)))

(define-public (set-dao-governor (new principal))
  (begin
    (try! (assert-dao))
    (var-set dao-governor new)
    (ok true)))

(define-public (set-fees (new-client-fee uint) (new-freelancer-fee uint))
  (begin
    (try! (assert-dao))
    (asserts! (<= (+ new-client-fee new-freelancer-fee) MAX-FEE-TOTAL) ERR-FEE-TOO-HIGH)
    (var-set fee-client new-client-fee)
    (var-set fee-freelancer new-freelancer-fee)
    (ok true)))

(define-public (set-paused (next bool))
  (begin
    (try! (assert-dao))
    (var-set paused next)
    (ok true)))

(define-public (create-project-stx
    (freelancer principal)
    (m1 uint) (m2 uint) (m3 uint) (m4 uint))
  (begin
    (try! (assert-not-paused))
    (asserts! (not (is-eq tx-sender freelancer)) ERR-NOT-CLIENT)
    (let ((id (+ (var-get project-counter) u1))
          (gross (+ m1 (+ m2 (+ m3 m4))))
          (dao-cut (/ (* (+ m1 (+ m2 (+ m3 m4))) DAO-INSTANT-CUT) u10000))
          (client-fee (/ (* (+ m1 (+ m2 (+ m3 m4))) (var-get fee-client)) u10000))
          (freelancer-fee (/ (* (+ m1 (+ m2 (+ m3 m4))) (var-get fee-freelancer)) u10000))
          (ms-count (count-ms m1 m2 m3 m4)))
      (asserts! (> gross u0) ERR-INVALID-AMOUNT)
      (asserts! (and (>= ms-count u1) (<= ms-count MAX-MILESTONES)) ERR-INVALID-MS)
      (try! (stx-transfer? gross tx-sender current-contract))
      (if (> dao-cut u0)
        (try! (as-contract? ((with-stx dao-cut))
               (try! (stx-transfer? dao-cut tx-sender (var-get dao-wallet)))))
        true)
      (if (> client-fee u0)
        (try! (as-contract? ((with-stx client-fee))
               (try! (stx-transfer? client-fee tx-sender (var-get dao-wallet)))))
        true)
      (var-set project-counter id)
      (map-set projects id {
        client: tx-sender,
        freelancer: freelancer,
        total-gross: gross,
        total-net: (- gross (+ dao-cut (+ client-fee freelancer-fee))),
        dao-cut: dao-cut,
        fee-client: client-fee,
        fee-freelancer: freelancer-fee,
        ms-count: ms-count,
        token-type: TOKEN-STX,
        refunded: false,
        created-at: burn-block-height
      })
      (if (> m1 u0) (map-set milestones {project: id, ms: u1} {amount: m1, complete: false, released: false, completed-at: u0}) true)
      (if (> m2 u0) (map-set milestones {project: id, ms: u2} {amount: m2, complete: false, released: false, completed-at: u0}) true)
      (if (> m3 u0) (map-set milestones {project: id, ms: u3} {amount: m3, complete: false, released: false, completed-at: u0}) true)
      (if (> m4 u0) (map-set milestones {project: id, ms: u4} {amount: m4, complete: false, released: false, completed-at: u0}) true)
      (print {event: "STXWORX-Job-Created", id: id, gross: gross, dao-cut: dao-cut, ts: burn-block-height})
      (ok id))))

(define-read-only (get-project-count)
  (var-get project-counter))

(define-read-only (get-project (project-id uint))
  (map-get? projects project-id))

(define-read-only (get-milestone (project-id uint) (milestone-num uint))
  (map-get? milestones {project: project-id, ms: milestone-num}))

(define-read-only (get-fees)
  {client: (var-get fee-client), freelancer: (var-get fee-freelancer)})

(define-read-only (get-dao-wallet)
  (var-get dao-wallet))

(define-read-only (get-dao-governor)
  (var-get dao-governor))

(define-read-only (is-paused)
  (var-get paused))
