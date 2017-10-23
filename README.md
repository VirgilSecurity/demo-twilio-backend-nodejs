# Virgil Twilio Demo Chat API v1

Application API server for the Virgil Twilio Demo Chat app. Its primary purpose is to register users' Virgil Cards on 
Virgil Cards service and generate Twilio Access Tokens. Uses ad hoc [Virgil Auth](https://github.com/VirgilSecurity/virgil-services-auth) 
service to authenticate users without passwords.


 ## Contents
 * [Endpoints](#endpoints)
    * [POST /v1/users](#post-v1users)
    * [GET /v1/tokens/twilio](#get-v1tokenstwilio)
 * [Authorization](#authorization)
 * [Errors](#errors)
    
 
 ## Endpoints
 
 ### POST /v1/users
 
 An endpoint to register new user. Expects a _Card Signing Request_ as its only parameter. The CSR must satisfy 
 the following requirements:
 
 * `scope` must be `"application"`.
 * `identity` must be unique. Attempt to register a card with duplicate identity will result in an error.
 * Must contain `"deviceId"` attribute in the `data` field. Device id can be any string that uniquely identifies 
 user's device.
 
 **Request**
 ```json
{
  "csr": "eyJjb250ZW50X3NuYXBzaG90IjoiZXlKcFpHVnVkR2...k9In19fQ=="
}
```

**Response**

If request is successful, the user's Virgil Card is returned:
 
```json
{
    "id": "bb5db5084dab51113...",
    "content_snapshot":"eyJwdWJsaWNfa2V5IjoiT...",
    "meta": {
        "created_at": "2017-10-22T07:03:42+0000",
        "card_version": "4.0",
        "signs": {
            "bb5db5084dab51...":"MIGaMA0GCWCGSAFl...",
            "767b6b12702df1...":"MIGaMA0GCWCGSAFl...",
            "ab799a2f26333c...":"MIGaMA0GCWCGSAFl..."
        }
    }
}
```

### GET /v1/tokens/twilio

An endpoint to obtain an access token for the Twilio API.
 
> This endpoint requires [authorization](#authorization).

**Response**
```json
{
  "twilioToken": "eyJvd24iOiIzYWY1ZWY3OTE...GUiOiIqIn0"
}
```


## Authorization

To authorize the request, the client app must [obtain an access token](https://github.com/VirgilSecurity/virgil-services-auth#post-v4authorizationactionsobtain-access-token) 
from the Virgil Auth service and include it in the `Authorization` header of the request:
```
Authorization: Bearer eyJhbGciOiJ2aXJnaWwiLCJ0eXA...i8m2asGQM
```

## Errors

Application uses standard HTTP response codes:

```
200 - Success
401 - Authentication failed
500 - Server error
```

Additional information about the error is returned in response body as JSON object:
```json
{
  "status": {numeric_http_status},
  "errorCode": {numeric_error_code},
  "message": "Message containing error details"
}
```