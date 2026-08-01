# nodejs-pro
How to start an HTTP server: `node src/server.js`
How to start an HTTPS server: `node src/https-server.js`

Before running an HTTPS server, copy your SSL certificate files into the project directory or generate them with the following command:
`openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 \
-subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"`

If you use a self-signed certificate and start HTTPS server, expect the output from command `openssl s_client -connect localhost:3443` like this:
```
Connecting to ::1
CONNECTED(00000005)
Can't use SSL_get_servername
depth=0 CN=localhost
verify error:num=18:self-signed certificate
verify return:1
depth=0 CN=localhost
verify return:1
---
Certificate chain
 0 s:CN=localhost
   i:CN=localhost
   a:PKEY: RSA, 2048 (bit); sigalg: sha256WithRSAEncryption
   v:NotBefore: Aug  1 14:31:31 2026 GMT; NotAfter: Aug  1 14:31:31 2027 GMT
---
Server certificate
-----BEGIN CERTIFICATE-----
<public key in base 64 format>
-----END CERTIFICATE-----
subject=CN=localhost
issuer=CN=localhost
---
No client certificate CA names sent
Peer signing digest: SHA256
Peer signature type: rsa_pss_rsae_sha256
Negotiated TLS1.3 group: X25519MLKEM768
---
SSL handshake has read 2447 bytes and written 1602 bytes
Verification error: self-signed certificate
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Protocol: TLSv1.3
Server public key is 2048 bit
This TLS version forbids renegotiation.
Compression: NONE
Expansion: NONE
No ALPN negotiated
Early data was not sent
Verify return code: 18 (self-signed certificate)
---
---
Post-Handshake New Session Ticket arrived:
SSL-Session:
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_256_GCM_SHA384
    Session-ID: <64 hex digits>
    Session-ID-ctx:
    Resumption PSK: <96 hex digits>
    PSK identity: None
    PSK identity hint: None
    SRP username: None
    TLS session ticket lifetime hint: 7200 (seconds)
    TLS session ticket:
    <hexdump of TLS session ticket>

    Start Time: <timestamp in seconds>
    Timeout   : 7200 (sec)
    Verify return code: 18 (self-signed certificate)
    Extended master secret: no
    Max Early Data: 0
---
read R BLOCK
---
Post-Handshake New Session Ticket arrived:
SSL-Session:
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_256_GCM_SHA384
    Session-ID: <64 hex digits>
    Session-ID-ctx:
    Resumption PSK: <96 hex digits>
    PSK identity: None
    PSK identity hint: None
    SRP username: None
    TLS session ticket lifetime hint: 7200 (seconds)
    TLS session ticket:
    <hexdump of TLS session ticket>

    Start Time: <timestamp in seconds>
    Timeout   : 7200 (sec)
    Verify return code: 18 (self-signed certificate)
    Extended master secret: no
    Max Early Data: 0
---
read R BLOCK
```
As you can see, certificate verification fails with code 18 because it is self-signed.
