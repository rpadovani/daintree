Since we support multiple kind of logins (Cognito and Access Token), and we support also switching between different 
roles, this Vuex store is a bit tricky.

## Login

First, let's talk about logins. We have two different actions to login:
- loginWithAccessKey()
- loginWithCognito()

loginWithAccessKey requires an Access Key ID and a Secret Access Key. It uses them as AWS Config and tries to login 
with STS. If it has success, the loginWithAccessKey action commits to the store with the loggedInWithAccessKey mutation. 
Such mutation stores the Access Key ID, the Secret Access Key, and data retrieved with STS. We store the Access Key ID 
and the Secret Access Key to being able to return to the main account after a role has been switched.
If something goes wrong during the login, the action will commit a mutation to show a notification.

loginWithCognito, on the other hand, is used only after we receive a callback from AWS: being a callback, we have to 
reinstate the whole application, so it doesn't make much sense to use the store before that... 
The action requires the issuer, the identity pool id, and the access token received from the issuer. It uses them to 
retrieve a role, and if it is successful stores everything with a dedicated mutation.
If something goes wrong during the login, the action will commit a mutation to show a notification.

## Roles

We use the assumeRole action to switch role, both for roles we have already assumed and for new roles, since we have to
check if we still have access.
