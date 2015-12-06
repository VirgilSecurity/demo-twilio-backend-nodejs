# Virgil IP Messaging

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio IP messaging API.

## How it works
![IPMessaging](https://github.com/VirgilSecurity/virgil/blob/master/images/IPMessaging.jpg)

## Publish

There are only two steps required to publish Virgil History Service :)

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
To review the changes required to use Virgil Security's security infrastructure with Twilio IP Messaging please visit [this document](./Quick%20start%20guide.md).
