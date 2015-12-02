# Virgil IP Messaging

This is an instruction how to install and integrate Virgil Security to Twilio IP messaging API.

![IPMessaging](https://github.com/VirgilSecurity/virgil/blob/master/images/IPMessaging.jpg)

## Publish

Only two steps to publish Virgil History Service :)

- Run **Virgil.TwilioService.sln** in Visual Studio Community 2015 (it is free)
- Right click on **Virgil.TwilioIPMessaging** project > then **Publish** (with your Azure credentials)

## Configuration

Set Twilio & Virgil authentication tokens in web.config

```
  <appSettings>
    ...
    <add key="twilio:AccountSID" value="{TWILIO_ACCOUNT_SID}" />
    <add key="twilio:AuthToken" value="{TWILIO_AUTH_TOKEN}" />
    <add key="twilio:IpMessagingServiceSID" value="{TWILIO_IP_MESSAGING_SERVICE_SID}" />
    <add key="virgil:AppToken" value="{VIRGIL_SECURITY_ACCESS_TOKEN}" />
    ...
  </appSettings>
```

## Quick start guide
To review the Twilio quick start guide adjustments please visit [this document](./Quick%20start%20guide.md).
