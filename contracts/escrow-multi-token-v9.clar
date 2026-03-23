(define-trait sip010-ft-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
  ))

(define-constant DAO-FEE-BPS u1000)
(define-constant TOKEN-STX u0)
(define-constant TOKEN-SBTC u1)
(define-constant TOKEN-USDCX u2)

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

(define-constant CONTRACT-OWNER tx-sender)
(define-data-var project-counter uint u0)

(define-map projects uint
  {
    client: principal,
    freelancer: principal,
    token-type: uint,
    token-contract: (optional principal),
    total-amount: uint,
    num-milestones: uint
  })

(define-map milestones {project-id: uint, milestone-num: uint}
  {
    amount: uint,
    complete: bool,
    released: bool
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

(define-private (assert-token-contract (expected (optional principal)) (token <sip010-ft-trait>))
  (match expected
    contract-principal (ok (asserts! (is-eq (contract-of token) contract-principal) ERR-INVALID-TOKEN))
    ERR-INVALID-TOKEN))

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
      (m1-fee (calc-fee m1))
      (m2-fee (calc-fee m2))
      (m3-fee (calc-fee m3))
      (m4-fee (calc-fee m4))
      (m1-net (- m1 m1-fee))
      (m2-net (- m2 m2-fee))
      (m3-net (- m3 m3-fee))
      (m4-net (- m4 m4-fee))
      (total-net (+ m1-net (+ m2-net (+ m3-net m4-net))))
      (num-milestones (count-milestones m1 m2 m3 m4))
    )
    (map-set projects id {
      client: contract-caller,
      freelancer: freelancer,
      token-type: token-type,
      token-contract: token-contract,
      total-amount: total-net,
      num-milestones: num-milestones
    })
    (if (> m1 u0)
      (map-set milestones {project-id: id, milestone-num: u1} {amount: m1-net, complete: false, released: false})
      true)
    (if (> m2 u0)
      (map-set milestones {project-id: id, milestone-num: u2} {amount: m2-net, complete: false, released: false})
      true)
    (if (> m3 u0)
      (map-set milestones {project-id: id, milestone-num: u3} {amount: m3-net, complete: false, released: false})
      true)
    (if (> m4 u0)
      (map-set milestones {project-id: id, milestone-num: u4} {amount: m4-net, complete: false, released: false})
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

(define-public (create-project-stx
  (freelancer principal)
  (m1 uint)
  (m2 uint)
  (m3 uint)
  (m4 uint))
  (let (
      (id (+ (var-get project-counter) u1))
      (total (+ m1 (+ m2 (+ m3 m4))))
      (total-fee (+ (calc-fee m1) (+ (calc-fee m2) (+ (calc-fee m3) (calc-fee m4)))))
    )
    (asserts! (> total u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq contract-caller freelancer)) ERR-SAME-PARTY)
    (asserts! (is-valid-layout m1 m2 m3 m4) ERR-INVALID-MILESTONE-LAYOUT)
    (try! (deposit-stx-into-escrow total))
    (try! (send-stx-from-escrow total-fee CONTRACT-OWNER))
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
      (total-fee (+ (calc-fee m1) (+ (calc-fee m2) (+ (calc-fee m3) (calc-fee m4)))))
      (token-contract (contract-of sbtc-token))
    )
    (asserts! (> total u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq contract-caller freelancer)) ERR-SAME-PARTY)
    (asserts! (is-valid-layout m1 m2 m3 m4) ERR-INVALID-MILESTONE-LAYOUT)
    (try! (deposit-ft-into-escrow total sbtc-token))
    (try! (send-ft-from-escrow total-fee CONTRACT-OWNER sbtc-token))
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
      (total-fee (+ (calc-fee m1) (+ (calc-fee m2) (+ (calc-fee m3) (calc-fee m4)))))
      (token-contract (contract-of usdcx-token))
    )
    (asserts! (> total u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq contract-caller freelancer)) ERR-SAME-PARTY)
    (asserts! (is-valid-layout m1 m2 m3 m4) ERR-INVALID-MILESTONE-LAYOUT)
    (try! (deposit-ft-into-escrow total usdcx-token))
    (try! (send-ft-from-escrow total-fee CONTRACT-OWNER usdcx-token))
    (var-set project-counter id)
    (store-project-and-milestones id freelancer TOKEN-USDCX (some token-contract) m1 m2 m3 m4)
    (ok id)))

(define-public (complete-milestone (project-id uint) (milestone-num uint))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
    )
    (asserts! (is-eq contract-caller (get freelancer project)) ERR-NOT-FREELANCER)
    (asserts! (not (get complete milestone)) ERR-ALREADY-COMPLETE)
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: (get amount milestone),
        complete: true,
        released: (get released milestone)
      })
    (ok true)))

(define-public (release-milestone-stx (project-id uint) (milestone-num uint))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (asserts! (is-eq (get token-type project) TOKEN-STX) ERR-INVALID-TOKEN)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get complete milestone) ERR-NOT-COMPLETE)
    (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
    (try! (send-stx-from-escrow amount (get freelancer project)))
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: amount,
        complete: true,
        released: true
      })
    (ok amount)))

(define-public (release-milestone-sbtc (project-id uint) (milestone-num uint) (sbtc-token <sip010-ft-trait>))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (asserts! (is-eq (get token-type project) TOKEN-SBTC) ERR-INVALID-TOKEN)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get complete milestone) ERR-NOT-COMPLETE)
    (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
    (try! (assert-token-contract (get token-contract project) sbtc-token))
    (try! (send-ft-from-escrow amount (get freelancer project) sbtc-token))
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: amount,
        complete: true,
        released: true
      })
    (ok amount)))

(define-public (release-milestone-usdcx (project-id uint) (milestone-num uint) (usdcx-token <sip010-ft-trait>))
  (let (
      (project (unwrap! (map-get? projects project-id) ERR-PROJECT-NOT-FOUND))
      (milestone (unwrap! (map-get? milestones {project-id: project-id, milestone-num: milestone-num}) ERR-INVALID-MILESTONE))
      (amount (get amount milestone))
    )
    (asserts! (is-eq contract-caller (get client project)) ERR-NOT-CLIENT)
    (asserts! (is-eq (get token-type project) TOKEN-USDCX) ERR-INVALID-TOKEN)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get complete milestone) ERR-NOT-COMPLETE)
    (asserts! (not (get released milestone)) ERR-ALREADY-RELEASED)
    (try! (assert-token-contract (get token-contract project) usdcx-token))
    (try! (send-ft-from-escrow amount (get freelancer project) usdcx-token))
    (map-set milestones
      {project-id: project-id, milestone-num: milestone-num}
      {
        amount: amount,
        complete: true,
        released: true
      })
    (ok amount)))

(define-read-only (get-project-count)
  (var-get project-counter))