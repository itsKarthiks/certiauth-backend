# Certificate Verification Server

A secure, RESTful backend service designed to issue, store, and verify digital certificates. This system ensures data integrity and authenticity by leveraging SHA-256 hashing and RSA asymmetric cryptography alongside standard CRUD operations and ACID-compliant database transactions.

## 🏗 System Architecture

The following diagram illustrates the data flow for the core certificate issuance and verification processes.

```mermaid
graph TD
    Client[Client Application] -->|HTTP POST /issue| Router[Express Router]
    Router --> Controller[Certificate Controller]
    
    subgraph Cryptographic Layer
        Controller -->|Payload| Hasher[SHA-256 Hashing]
        Hasher -->|Hash| Signer[RSA Signing with Private Key]
    end

    subgraph Database Layer
        Signer -->|Signed Certificate Data| DB[(Database)]
    end

    Client -->|HTTP POST /verify| VerifyRouter[Express Router]
    VerifyRouter --> VerifyController[Verification Controller]
    VerifyController -->|Fetch Public Key| RSA[RSA Verification]
    RSA -->|Compare Hashes| Result{Valid?}
    Result -->|Yes| Success[Return 200 OK]
    Result -->|No| Reject[Return 400 Invalid]