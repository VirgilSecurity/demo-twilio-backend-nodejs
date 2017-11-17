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
 * `identity` must be unique. Attempt to register a card with duplicate identity will result in `400 BadRequest` error.
 * Must contain `"deviceId"` attribute in the `data` field. Device id can be any string that uniquely identifies 
 user's device.
 
 **Request**
 ```json
{
  "csr": "eyJjb250ZW50X3NuYXBzaG90IjoiZXlKcFpHVnVkR2...k9In19fQ=="
}
```

**Response**

If request is successful, the string representation of the user's Virgil Card is returned:

> Request must include `Content-Type: "application/json"` header 
 
```json
{
    "virgil_card": "eyJjb250ZW50X3NuYXBzaG90IjoiZXlKcFpHVnVkR2...k9In19fQ=="
}
```
You can then use virgil sdk to `import` a Virgil Card object from this string. 

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
400 - Request error
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
