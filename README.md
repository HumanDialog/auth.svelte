# @humandialog/auth.svelte

<h1 style="font-size: 64px">
<img src="https://objectreef.dev/reef.png" alt="ObjectReef logo" width="90">
ObjectReef&reg;
</h1>

Svelte package to support ObjectReef Identity Provider.\
ObjectReef Identity Provider is available at https://objectreef.io/auth and it's OIDC compliant 
authorization service available for developers who create applications using [ObjectReef](https://objectreef.dev)

## Installing
To install the package on your Svelte project type:\
`npm install @humandialog/auth.svelte`

## Usage

### Configuration
```js
    // App.svelte
    import {reef} from '@humandialog/auth.svelte'

    reef.configure( 
            {
              mode: 'remote', // possible: 'remote', 'local', 'disabled'
              remote: {
                  iss:       "https://objectreef.io",
                  client_id: "<YOUR_CLIENT_ID>",
                  client_secret: "<YOUR_CLIENT_SECRET>",
                  scope:     "openid profile email <YOUR_APP_ID>",
                  api_version: "v001",
                  refresh_token_persistent: true,
                  
                  // Used only for signup form. Optional. 
                  // If specified checkboxes on consents are presented
                  terms_and_conditions_href: "https://example.com/terms-and-conditions"
                  privacy_policy_href: "https://example.com/privacy-policy"
              },
              local: {
                api: "http://localhost:1996",
                api_version: "v002",
                users: [
                    "bob@example.com",
                    "alice@example.com"
                ]
              }
            })
```
In application root file ***App.svelte*** set up the the ObjectReef SDK with `reef.configure` by passing
a configuration object. Authorization can be switched between `'remote'` and `'local'` or it can be `'disabled'` at all. The `'remote'` is the most common mode when your website is already published and registered in the ObjectReef Auth.

The `'local'` mode can be useful during the local developement when you need request API in context of specified user. The list of such users needs to be provided as `users` array in configuration object. In this mode, the website asks current active user instead of redirecting the browser to sign-in page.

### Components
There are just few Svelte components to apply authorization to your website.

#### AuthorizedView
The `AuthorizedView` should be a root component for all autorized views on your website. Usualy it embedd the whole `App` content with routing component. \

The component parameters are:
- `autoRedirectToSignIn :boolean` which is `true` by default.\
Redirects the browser automatically to sign-in page in case when user has not yet been authorized. 

##### Example:
```html
    <!-- App.svelte -->
    <AuthorizedView>
        <!-- my SPA entry-point -->
        <Router {routes} />
    </AuthorizedView>
```

#### Authorized
The `Authorized` encapsulate content which should be visible only when user has been authorized.

##### Example:
```html
    <Authorized>
        <a href={$signout_href}>Sign out</a>
    </Authorized>
```

#### NotAuthorized
The `NotAuthorized` encapsulate content which should be visible only when user has not been authorized.

##### Example:
```html
    <NotAuthorized>
        <a href={$signin_href}>Sign in</a>
    </NotAuthorized>
```

### `reef.get` function
The `reef.get` makes HTTP GET request to the service and returns JavaScript object as a result. It will:
 - adds API version specified in `reef.configure`
 - adds `Authorization` header to each request with issued access token
 - refreshes access token when expired
 - concatenates tenant proper DNS address issued during authorization.
 - the request result is converted from JSON to JavaSctipt object

##### Example:
```js
    let res = await reef.get("app/Lists/count");
```

### `reef.post` function
The `reef.post` makes HTTP POST request to the service and returns JavaScript object as a result. It will:
 - adds API version specified in `reef.configure`
 - adds `Authorization` header to each request with issued access token
 - refreshes access token when expired
 - concatenates tenant proper DNS address issued during authorization.
 - passed body parameter should be a JavaScript object
 - the request result is converted from JSON to JavaSctipt object

##### Example:
```js
    let res = await reef.post("app/Lists/new", { Name: 'My List Name' });
```

### `reef.delete` function
The `reef.delete` makes HTTP DELETE request to the service. It will:
 - adds API version specified in `reef.configure`
 - adds `Authorization` header to each request with issued access token
 - refreshes access token when expired
 - concatenates tenant proper DNS address issued during authorization.
 
##### Example:
```js
    let res = await reef.delete("app/Lists/last");
```

### `reef.fetch` function
The `reef.fetch` is more general operation comparing to `reef.get` or `reef.post`.
It wraps original `fetch` function with authorization support stuff. It will:
 - add `Authorization` header to each request with issued access token
 - refreshes access token when expired
 - concatenates tenant proper DNS address issued during authorization.

 > **_NOTE:_**\
 ObjectReef multitenancy support assumes every tenant API is available at different DNS address like `tenant_qwerty.objectreef.io`. It means the proper API depends on which workspace authenticated user belongs to.

 ##### Example:
```js
    let res = await reef.fetch("/json/v001/app/Lists/new",
                                {
                                    method:'POST',
                                    body: JSON.stringify({Name: list_name})
                                });
```

### `reef.am_I_admin` function
The `reef.am_I_admin` makes HTTP GET request to the ObjectReef Identity Provider to check is authenticated user has admin privileges for current tenant.

##### Example:
```js
    let is_admin = await reef.am_I_admin();
```

### Useful variables
#### `$session.user`
The `$session.user` object contains authenticated user info
| member     | type    |
| ---------- | ------- |
| `given_name` | `string`  |
| `family_name` | `string`  |
| `picture` | `string`  |
| `email` | `string`  |
| `email_verified` | `boolean`  |

#### `$session.id_token` and `$session.access_token`
Returns the ***id_token*** or ***access_token*** object with members like the following:
| member     | type    |
| ---------- | ------- |
| `header` | `string`  |
| `payload` | `string`  |
| `raw` | `string`  |
| `is_jwt` | `boolean`  |
| `not_expired` | `boolean`  |
| `get_claim<T>(key :string)` | `T\|undefined`  |


#### `$session.api_address :string`
Returns tenant API address

#### `$session.tid :string`
Returns tenant id


#### `$signin_href`, `$signout_href` and `$signup_href`
Returns `string` value to make sign-in, sign-out or sign-up anchor
 ##### Example:
```html
    <a href={$signout_href}>Sign out</a>
    <a href={$signin_href}>Sign in</a>
    <a href={$signup_href}>Sign up</a>
```



**Enjoy!**
