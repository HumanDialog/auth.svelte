# @humandialog/auth.svelte

Svelte package to support Object Reef Identity Provider.\
Object Reef Identity Provider is available at https://objectreef.io/auth and it's OIDC compliant 
authorization service available for developers who create applications using [Object Reef](https://objectreef.dev)

## Installing
To install the package on your Svelte project type:\
`npm install @humandialog/auth.svelte`

## Usage

### Configuration
```js
    // App.svelte
    import {session} from '@humandialog/auth.svelte'

    $session.configure( 
            {
              mode: 'remote', // possible: 'remote', 'local', 'disabled'
              remote: {
                  iss:       "https://objectreef.io",
                  client_id: "<YOUR_CLIENT_ID>",
                  client_secret: "<YOUR_CLIENT_SECRET>",
                  scope:     "openid profile email <YOUR_APP_ID>",
              },
              local: {
                api: "http://localhost:1996",
                users: [
                    "bob@example.com",
                    "alice@example.com"
                ]
              }
            })
```
In application root file ***App.svelte*** set up the `$session` variable by passing
a configuration object. Authorization can be switched between `'remote'` and `'local'` or it can be `'disabled'` at all. The `'remote'` is the most common mode when your website is already published and registered in the Object Reef Auth.

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
### `Auth.fetch` function
The `Auth.fetch` wraps original `fetch` function support authorization stuff. It will:
 - add `Authorization` header to each request with issued access token
 - refreshes access token when expired
 - concatenates tenant proper DNS address issued during authorization.

 > **_NOTE:_**\
 Object Reef multitenancy support assumes every tenant API is available at different DNS address like `tenant_qwerty.objectreef.io`. It means the proper API depends on which workspace authenticated user belongs to.

 ##### Example:
```js
    let res = await Auth.fetch("/json/yav1/app/Lists/new",
                                {
                                    method:'POST',
                                    body: JSON.stringify({Name: list_name})
                                });
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

#### `$session.is_admin :boolean`
Returns `true` when authenicated user has ***admin*** privileges and can add and delete other users from tenant.

#### `$signin_href` and `$signout_href`
Returns `string` value to make sign-in and sign-out anchor
 ##### Example:
```html
    <a href={$signout_href}>Sign out</a>
    <a href={$signin_href}>Sign in</a>
```



**Enjoy!**
