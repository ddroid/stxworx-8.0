(define-trait sip010-ft-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
  ))

(define-constant DAO-FEE-BPS u1000)
(define-constant TOKEN-STX u0)
(define-constant TOKEN-SBTC u1)
(define-constant TOKEN-USDCX u2)

(define-constant PROJECT-STATUS-ACTIVE u0)
(define-constant PROJECT-STATUS-REFUNDED u1)
(define-constant PROJECT-STATUS-COMPLETED u2)

(define-constant REFUND-STATUS-NONE u0)
(define-constant REFUND-STATUS-REQUESTED u1)
(define-constant REFUND-STATUS-CANCELLED u2)
(define-constant REFUND-STATUS-REFUNDED u3)

(define-constant ERR-NOT-CLIENT (err u100))
(define-constant ERR-NOT-FREELANCER (err u101))
(define-constant ERR-PROJECT-NOT-FOUND (err u102))
(define-constant ERR-INVALID-MILESTONE (err u103))
(define-constant ERR-NOT-COMPLETE (err u105))
(define-constant ERR-ALREADY-RELEASED (err u106))
(define-constant ERR-INVALID-AMOUNT (err u108))
(define-constant ERR-ALREADY-COMPLETE (err u116))
(define-constant ERR-INVALID-TOKEN (err u117))
(define-constant ERR-INVALID-MILESTONE-LAYOUT (err u132))
(define-constant ERR-SAME-PARTY (err u133))
(define-constant ERR-NOT-CONTRACT-OWNER (err u134))
(define-constant ERR-NOT-REFUND-ADMIN (err u135))
(define-constant ERR-INVALID-PROJECT-STATUS (err u136))
(define-constant ERR-REFUND-NOT-REQUESTED (err u137))
(define-constant ERR-REFUND-ALREADY-REQUESTED (err u138))
(define-constant ERR-ALREADY-REFUNDED (err u139))
(define-constant ERR-NO-REMAINING-BALANCE (err u140))
(define-constant ERR-TOKEN-CONTRACT-NOT-CONFIGURED (err u141))

(define-constant CONTRACT-OWNER tx-sender)

(define-data-var project-counter uint u0)
(define-data-var refund-admin principal CONTRACT-OWNER)
(define-data-var sbtc-token-contract (optional principal) none)
(define-data-var usdcx-token-contract (optional principal) none)

(define-map projects uint
  {
    client: principal,
    freelancer: principal,
    token-type: uint,
    token-contract: (optional principal),
    total-amount: uint,
    total-released: uint,
    num-milestones: uint,
    status: uint,
    refund-status: uint
  })

(define-map milestones {project-id: uint, milestone-num: uint}
  {
    amount: uint,
    complete: bool,
    released: bool
  })

(define-map refund-records uint
  {
    requester: principal,
    approver: (optional principal),
    admin-actor: (optional principal),
    refunded-amount: uint
  })

(define-private (calc-fee (amount uint))
  (/ (* amount DAO-FEE-BPS) u10000))

(define-private (count-milestones (m1 uint) (m2 uint) (m3 uint) (m4 uint))
  (+
    (if (> m1 u0) u1 u0)
    (+
      (if (> m2 u0) u1 u0)
      (+
        (if (> m3 u0) u1 u0)
        (if (> m4 u0) u1 u0)))))

(define-private (is-valid-layout (m1 uint) (m2 uint) (m3 uint) (m4 uint))
  (and
    (> m1 u0)
    (or (> m2 u0) (and (is-eq m3 u0) (is-eq m4 u0)))
    (or (> m3 u0) (is-eq m4 u0))))

(define-private (get-allowed-token-contract (token-type uint))
  (if (is-eq token-type TOKEN-SBTC)
    (var-get sbtc-token-contract)
    (if (is-eq token-type TOKEN-USDCX)
      (var-get usdcx-token-contract)
      none)))

(define-private (assert-token-contract (expected (optional principal)) (token <sip010-ft-trait>))
  (let ((contract-principal (unwrap! expected ERR-TOKEN-CONTRACT-NOT-CONFIGURED)))
    (asserts! (is-eq (contract-of token) contract-principal) ERR-INVALID-TOKEN)
    (ok true)))

(define-private (store-project-and-milestones
  (id uint)
  (freelancer principal)
  (token-type uint)
  (token-contract (optional principal))
  (m1 uint)
  (m2 uint)
  (m3 uint)
  (m4 uint))
  (let (
      (total-amount (+ m1 (+ m2 (+ m3 m4))))
      (num-milestones (count-milestones m1 m2 m3 m4))
    )
    (map-set projects id {
      client: contract-caller,
      freelancer: freelancer,
      token-type: token-type,
      token-contract: token-contract,
      total-amount: total-amount,
      total-released: u0,
      num-milestones: num-milestones,
      status: PROJECT-STATUS-ACTIVE,
      refund-status: REFUND-STATUS-NONE
    })
    (if (> m1 u0)
      (map-set milestones {project-id: id, milestone-num: u1} {amount: m1, complete: false, released: false})
      true)
    (if (> m2 u0)
      (map-set milestones {project-id: id, milestone-num: u2} {amount: m2, complete: false, released: false})
      true)
    (if (> m3 u0)
      (map-set milestones {project-id: id, milestone-num: u3} {amount: m3, complete: false, released: false})
      true)
    (if (> m4 u0)
      (map-set milestones {project-id: id, milestone-num: u4} {amount: m4, complete: false, released: false})
      true)
    true))

(define-private (contract-self)
  (unwrap-panic (as-contract? () tx-sender)))

(define-private (deposit-stx-into-escrow (amount uint))
  (stx-transfer? amount contract-caller (contract-self)))

(define-private (deposit-ft-into-escrow (amount uint) (token <sip010-ft-trait>))
  (contract-call? token transfer amount contract-caller (contract-self) none))

(define-private (send-stx-from-escrow (amount uint) (recipient principal))
  (if (> amount u0)
    (as-contract? ((with-stx amount))
      (try! (stx-transfer? amount tx-sender recipient))
      true)
    (ok true)))

(define-private (send-ft-from-escrow (amount uint) (recipient principal) (token <sip010-ft-trait>))
  (if (> amount u0)
    (as-contract? ((with-ft (contract-of token) "*" amount))
      (try! (contract-call? token transfer amount tx-sender recipient none))
      true)
    (ok true)))

(define-private (collect-stx-fee (amount uint))
  (if (> amount u0)
    (send-stx-from-escrow amount CONTRACT-OWNER)
    (ok true)))

(define-private (collect-ft-fee (amount uint) (token <sip010-ft-trait>))
  (if (> amount u0)
    (send-ft-from-escrow amount CONTRACT-OWNER token)
    (ok true)))

(define-private (release-stx-milestone-payout (amount uint) (freelancer principal))
  (let (
      (fee (calc-fee amount))
      (net-amount (- amount fee))
    )
    (try! (collect-stx-fee fee))
    (try! (send-stx-from-escrow net-amount freelancer))
    (ok true)))

(define-private (release-ft-milestone-payout (amount uint) (freelancer principal) (token <sip010-ft-trait>))
  (let (
      (fee (calc-fee amount))
      (net-amount (- amount fee))
    )
    (try! (collect-ft-fee fee token))
    (try! (send-ft-from-escrow net-amount freelancer token))
    (ok true)))

(define-private (get-remaining-amount-internal (project-id uint))
  (let ((project (unwrap-panic (map-get? projects project-id))))
    (if (is-eq (get status project) PROJECT-STATUS-REFUNDED)
      u0
      (- (get total-amount project) (get total-released project)))))

(define-private (assert-project-active (project-id uint) (project {
  client: principal,
  freelancer: principal,
  token-type: uint,
  token-contract: (optional principal),
  total-amount: uint,
  total-released: uint,
  num-milestones: uint,
  status: uint,
  refund-status: uint
 }))
  (begin
    (asserts! (is-eq (get status project) PROJECT-STATUS-ACTIVE) ERR-INVALID-PROJECT-STATUS)
    (asserts! (not (is-eq (get refund-status project) REFUND-STATUS-REFUNDED)) ERR-ALREADY-REFUNDED)
    (asserts! (> (get-remaining-amount-internal project-id) u0) ERR-NO-REMAINING-BALANCE)
    (ok true)))

(define-private (update-project-release-state (project-id uint) (project {
  client: principal,
  freelancer: principal,
  token-type: uint,
  token-contract: (optional principal),
  total-amount: uint,
  total-released: uint,
  num-milestones: uint,
  status: uint,
  refund-status: uint
}) (released-amount uint))
  (let (
      (next-total-released (+ (get total-released project) released-amount))
      (next-status (if (is-eq next-total-released (get total-amount project)) PROJECT-STATUS-COMPLETED PROJECT-STATUS-ACTIVE))
    )
    (map-set projects project-id {
      client: (get client project),
      freelancer: (get freelancer project),
      token-type: (get token-type project),
      token-contract: (get token-contract project),
      total-amount: (get total-amount project),
      total-released: next-total-released,
      num-milestones: (get num-milestones project),
      status: next-status,
      refund-status: (get refund-status project)
    })
    true))

(define-private (mark-project-refunded (project-id uint) (project {
  client: principal,
  freelancer: principal,
  token-type: uint,
  token-contract: (optional principal),
  total-amount: uint,
  total-released: uint,
  num-milestones: uint,
  status: uint,
  refund-status: uint
}))
  (map-set projects project-id {
    client: (get client project),
    freelancer: (get freelancer project),
    token-type: (get token-type project),
    token-contract: (get token-contract project),
    total-amount: (get total-amount project),
    total-released: (get total-amount project),
    num-milestones: (get num-milestones project),
    status: PROJECT-STATUS-REFUNDED,
    refund-status: REFUND-STATUS-REFUNDED
  }))

(define-private (set-project-refund-status (project-id uint) (project {
  client: principal,
  freelancer: principal,
  token-type: uint,
  token-contract: (optional principal),
  total-amount: uint,
  total-released: uint,
  num-milestones: uint,
  status: uint,
  refund-status: uint
}) (refund-status uint))
  (map-set projects project-id {
    client: (get client project),
    freelancer: (get freelancer project),
    token-type: (get token-type project),
    token-contract: (get token-contract project),
    total-amount: (get total-amount project),
    total-released: (get total-released project),
    num-milestones: (get num-milestones project),
    status: (get status project),
    refund-status: refund-status
  }))

(define-private (execute-stx-refund (project-id uint) (project {
  client: principal,
  freelancer: principal,
  token-type: uint,
  token-contract: (optional principal),
  total-amount: uint,
  total-released: uint,
  num-milestones: uint,
  status: uint,
  refund-status: uint
}) (approver (optional principal)) (admin-actor (optional principal)) (event-name (string-ascii 32)))
  (let ((remaining (get-remaining-amount-internal project-id)))
    (asserts! (> remaining u0) ERR-NO-REMAINING-BALANCE)
    (try! (send-stx-from-escrow remaining (get client project)))
    (mark-project-refunded project-id project)
    (map-set refund-records project-id {
      requester: (get client project),
      approver: approver,
      admin-actor: admin-actor,
      refunded-amount: remaining
    })
    (print {event: event-name, project-id: project-id, client: (get client project), amount: remaining})
    (ok remaining)))

(define-private (execute-ft-refund (project-id uint) (project {
  client: principal,
  freelancer: principal,
  token-type: uint,
  token-contract: (optional principal),
  total-amount: uint,
  total-released: uint,
  num-milestones: uint,
  status: uint,
  refund-status: uint
}) (token <sip010-ft-trait>) (approver (optional principal)) (admin-actor (optional principal)) (event-name (string-ascii 32)))
  (let ((remaining (get-remaining-amount-internal project-id)))
    (asserts! (> remaining u0) ERR-NO-REMAINING-BALANCE)
    (try! (assert-token-contract (get token-contract project) token))
    (try! (send-ft-from-escrow remaining (get client project) token))
    (mark-project-refunded project-id project)
    (map-set refund-records project-id {
      requester: (get client project),
      approver: approver,
      admin-actor: admin-actor,
      refunded-amount: remaining
    })
    (print {event: event-name, project-id: project-id, client: (get client project), amount: remaining, token: (contract-of token)})
    (ok remaining)))

(define-private (assert-contract-owner)
  (begin
    (asserts! (is-eq contract-caller CONTRACT-OWNER) ERR-NOT-CONTRACT-OWNER)
    (ok true)))

(define-public (set-refund-admin (new-admin principal))
  (begin
    (try! (assert-contract-owner))
    (var-set refund-admin new-admin)
    (ok new-admin)))

(define-public (set-supported-token-contract (token-type uint) (token-contract principal))
  (begin
    (try! (assert-contract-owner))
    (asserts! (or (is-eq token-type TOKEN-SBTC) (is-eq token-type TOKEN-USDCX)) ERR-INVALID-TOKEN)
    (if (is-eq token-type TOKEN-SBTC)
      (var-set sbtc-token-contract (some token-contract))
      (var-set usdcx-token-contract (some token-contract)))
    (ok token-contract)))

(define-public (create-project-stx
  (freelancer principal)
  (m1 uint)
  (m2 uint)
  (m3 uint)
  (m4 uint))
  (let (
      (id (+ (var-get project-counter) u1))
      (total (+ m1 (+ m2 (+ m3 m4))))
    )
    (asserts! (> total u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq contract-caller freelancer)) ERR-SAME-PARTY)
    (asserts! (is-valid-layout m1 m2 m3 m4) ERR-INVALID-MILESTONE-LAYOUT)
    (try! (deposit-stx-into-escrow total))
    (var-set project-counter id)
    (store-project-and-milestones id freelancer TOKEN-STX none m1 m2 m3 m4)
    (ok id)))

(define-public (create-project-sbtc
  (freelancer principal)
  (m1 uint)
  (m2 uint)
  (m3 uint)
  (m4 uint)
  (sbtc-token <sip010-ft-trait>))
  (let (
      (id (+ (var-get project-counter) u1))
      (total (+ m1 (+ m2 (+ m3 m4))))
      (expected-token-contract (get-allowed-token-contract TOKEN-SBTC))
      (token-contract (contract-of sbtc-token))
    )
    (asserts! (> total u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq contract-caller freelancer)) ERR-SAME-PARTY)
    (asserts! (is-valid-layout m1 m2 m3 m4) ERR-INVALID-MILESTONE-LAYOUT)
    (try! (assert-token-contract expected-token-contract sbtc-token))
    (try! (deposit-ft-into-escrow total sbtc-token))
    (var-set project-counter id)
    (store-project-and-milestones id freelancer TOKEN-SBTC (some token-contract) m1 m2 m3 m4)
    (ok id)))

(define-public (create-project-usdcx
  (freelancer principal)
  (m1 uint)
  (m2 uint)
  (m3 uint)
  (m4 uint)
  (usdcx-token <sip010-ft-trait>))
  (let (
      (id (+ (var-get project-counter) u1))
      (total (+ m1 (+ m2 (+ m3 m4))))
      (expected-token-contract (get-allowed-token-contract TOKEN-USDCX))
      (token-contract (contract-of usdcx-token))
    )
    (asserts! (> total u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq contract-caller freelancer)) ERR-SAME-PARTY)
    (asserts! (is-valid-layout m1 m2 m3 m4) ERR-INVALID-MILESTONE-LAYOUT)
    (try! (assert-token-contract expected-token-contract usdcx-token))
    (try! (deposit-ft-into-escrow total usdcx-token))
    (var-set project-counter id)
    (store-project-and-milestones id freelancer TOKEN-USDCX (some token-contract) m1 m2 m3 m4)
    (ok id)))

(define-public (complete-milestone (project-id uint) (milestone-num uint))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
    )
    (asserts! (is-eq contract-caller (get freelancer project)) ERR-NOT-FREELANCER)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-NONE) ERR-REFUND-ALREADY-REQUESTED)
    (asserts! (not (get complete milestone)) ERR-ALREADY-COMPLETE)
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: (get amount milestone),
        complete: true,
        released: (get released milestone)
      })
    (ok true)))

(define-public (request-refund (project-id uint))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (remaining (get-remaining-amount-internal project-id))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (asserts! (is-eq (get status project) PROJECT-STATUS-ACTIVE) ERR-INVALID-PROJECT-STATUS)
    (asserts! (> remaining u0) ERR-NO-REMAINING-BALANCE)
    (asserts! (not (is-eq (get refund-status project) REFUND-STATUS-REQUESTED)) ERR-REFUND-ALREADY-REQUESTED)
    (asserts! (not (is-eq (get refund-status project) REFUND-STATUS-REFUNDED)) ERR-ALREADY-REFUNDED)
    (set-project-refund-status project-id project REFUND-STATUS-REQUESTED)
    (map-set refund-records project-id {
      requester: contract-caller,
      approver: none,
      admin-actor: none,
      refunded-amount: u0
    })
    (print {event: "refund-requested", project-id: project-id, client: contract-caller, amount: remaining})
    (ok remaining)))

(define-public (cancel-refund-request (project-id uint))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (asserts! (is-eq (get status project) PROJECT-STATUS-ACTIVE) ERR-INVALID-PROJECT-STATUS)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-REQUESTED) ERR-REFUND-NOT-REQUESTED)
    (set-project-refund-status project-id project REFUND-STATUS-NONE)
    (print {event: "refund-request-cancelled", project-id: project-id, client: contract-caller})
    (ok true)))

(define-public (release-milestone-stx (project-id uint) (milestone-num uint))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-NONE) ERR-REFUND-ALREADY-REQUESTED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get complete milestone) ERR-NOT-COMPLETE)
    (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
    (try! (release-stx-milestone-payout amount (get freelancer project)))
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: amount,
        complete: true,
        released: true
      })
    (update-project-release-state project-id project amount)
    (ok amount)))

(define-public (release-milestone-sbtc (project-id uint) (milestone-num uint) (sbtc-token <sip010-ft-trait>))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-NONE) ERR-REFUND-ALREADY-REQUESTED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get complete milestone) ERR-NOT-COMPLETE)
    (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
    (try! (assert-token-contract (get token-contract project) sbtc-token))
    (try! (release-ft-milestone-payout amount (get freelancer project) sbtc-token))
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: amount,
        complete: true,
        released: true
      })
    (update-project-release-state project-id project amount)
    (ok amount)))

(define-public (release-milestone-usdcx (project-id uint) (milestone-num uint) (usdcx-token <sip010-ft-trait>))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-NONE) ERR-REFUND-ALREADY-REQUESTED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get complete milestone) ERR-NOT-COMPLETE)
    (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
    (try! (assert-token-contract (get token-contract project) usdcx-token))
    (try! (release-ft-milestone-payout amount (get freelancer project) usdcx-token))
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: amount,
        complete: true,
        released: true
      })
    (update-project-release-state project-id project amount)
    (ok amount)))

(define-public (approve-refund-stx (project-id uint))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (get freelancer project)) ERR-NOT-FREELANCER)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-REQUESTED) ERR-REFUND-NOT-REQUESTED)
    (print {event: "refund-approved", project-id: project-id, approver: contract-caller})
    (execute-stx-refund project-id project (some contract-caller) none "refund-executed")))

(define-public (approve-refund-sbtc (project-id uint) (sbtc-token <sip010-ft-trait>))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (get freelancer project)) ERR-NOT-FREELANCER)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-REQUESTED) ERR-REFUND-NOT-REQUESTED)
    (print {event: "refund-approved", project-id: project-id, approver: contract-caller, token: (contract-of sbtc-token)})
    (execute-ft-refund project-id project sbtc-token (some contract-caller) none "refund-executed")))

(define-public (approve-refund-usdcx (project-id uint) (usdcx-token <sip010-ft-trait>))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (get freelancer project)) ERR-NOT-FREELANCER)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get refund-status project) REFUND-STATUS-REQUESTED) ERR-REFUND-NOT-REQUESTED)
    (print {event: "refund-approved", project-id: project-id, approver: contract-caller, token: (contract-of usdcx-token)})
    (execute-ft-refund project-id project usdcx-token (some contract-caller) none "refund-executed")))

(define-public (admin-refund-stx (project-id uint))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (var-get refund-admin)) ERR-NOT-REFUND-ADMIN)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
    (execute-stx-refund project-id project none (some contract-caller) "admin-refund-executed")))

(define-public (admin-refund-sbtc (project-id uint) (sbtc-token <sip010-ft-trait>))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (var-get refund-admin)) ERR-NOT-REFUND-ADMIN)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
    (execute-ft-refund project-id project sbtc-token none (some contract-caller) "admin-refund-executed")))

(define-public (admin-refund-usdcx (project-id uint) (usdcx-token <sip010-ft-trait>))
  (let ((project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND)))
    (asserts! (is-eq contract-caller (var-get refund-admin)) ERR-NOT-REFUND-ADMIN)
    (try! (assert-project-active project-id project))
    (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
    (execute-ft-refund project-id project usdcx-token none (some contract-caller) "admin-refund-executed")))

(define-read-only (get-project-count)
  (var-get project-counter))

(define-read-only (get-project (project-id uint))
  (map-get? projects project-id))

(define-read-only (get-refund-record (project-id uint))
  (map-get? refund-records project-id))

(define-read-only (get-refund-admin)
  (var-get refund-admin))

(define-read-only (get-configured-token-contract (token-type uint))
  (get-allowed-token-contract token-type))

(define-read-only (get-remaining-amount (project-id uint))
  (ok (get-remaining-amount-internal project-id)))

(define-read-only (get-refund-status (project-id uint))
  (match (map-get? projects project-id)
    project (ok (get refund-status project))
    ERR-PROJECT-NOT-FOUND))

(define-read-only (can-request-refund (project-id uint))
  (match (map-get? projects project-id)
    project (ok
      (and
        (is-eq (get status project) PROJECT-STATUS-ACTIVE)
        (> (- (get total-amount project) (get total-released project)) u0)
        (not (is-eq (get refund-status project) REFUND-STATUS-REQUESTED))
        (not (is-eq (get refund-status project) REFUND-STATUS-REFUNDED))))
    ERR-PROJECT-NOT-FOUND))
