import { session, Session, App_instance_info } from "./Session";
import type { Configuration, Local_user } from "./Configuration";
import { derived, readable, get } from "svelte/store";
import { gv } from "./Storage";

const s = session;
let refreshing = false;

export class reef {
    public static configure(cfg) {
        let _session: Session = get(session);
        _session.configure(cfg);
    }

    public static async fetch(...args) {
        let [resource, options] = args;

        let given_url = '';
        given_url = resource;

        let _session: Session = get(session);

        // check if resource is absolute url, if not we add session.apiAddress obtained with auth tokens
        let absolute_pattern = /^https?:\/\//i;
        if (!absolute_pattern.test(given_url)) {
            let full_path = _session.apiAddress;
            if (full_path.endsWith('/')) {
                if (given_url.startsWith('/'))
                    full_path = full_path + given_url.substr(1);
                else
                    full_path = full_path + given_url;
            }
            else {
                if (given_url.startsWith('/'))
                    full_path = full_path + given_url;
                else
                    full_path = full_path + '/' + given_url;
            }

            resource = full_path;
        }

        if ((options == undefined) || (options == null))
            options = {};

        if ((options.headers == undefined) || (options.headers == null))
            options.headers = new Headers();

        if(!_session.checkStorageConsistency())
        {
            console.log('sessionStorage problem, full_path: ', resource)
        }

        if(!_session.isActive)
        {
            console.log('session not active on fetch: ', resource)
        }

        if (!options.headers.has("Authorization")) {
            if (_session.accessToken != null) {
                if (!_session.accessToken.not_expired) 
                {

                    console.log('sessionId:', _session.sessionId)
                    const iat = _session.accessToken.get_claim<number>("iat")
                    const exp = _session.accessToken.get_claim<number>("exp")
                    console.log('iat:', iat, new Date(iat * 1000))
                    console.log('exp:', exp, new Date(exp * 1000))

                    if(refreshing)
                    {
                        console.log('auth: request need to wait for tokens refreshing... ', resource)
                        const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
                        let triesNo = 10;
                        while(refreshing && triesNo>0)
                        {
                            await sleep(1000);
                            triesNo--;
                        }

                        if(refreshing)
                        {
                            console.log('auth: too long refresh waiting. drop the request')
                            return null;
                        }
                    }
                    else
                    {
                        console.log('auth: first req with expired token, refreshing...', resource)
                        refreshing = true;
                        const refreshingSuccess = await this.refreshTokens(_session)
                        refreshing = false;

                        if(!refreshingSuccess)
                            this.redirectToSignIn();

                    }
                }

                options.headers.append("Authorization", "Bearer " + _session.accessToken.raw);

            }
            else
            {
                console.log('auth: setting up x-reef- headers for local developement')
                const user: Local_user = _session.localDevCurrentUser;
                if (user) 
                {
                    if(user.uid > 0)
                    {
                        if(!options.headers.has("X-Reef-User-Id"))
                            options.headers.append('X-Reef-User-Id', user.uid)
                    }
                    else
                    {
                        if(!options.headers.has("X-Reef-As-User"))
                            options.headers.append('X-Reef-As-User', user.username)
                    }

                    if(user.role)
                    {
                        if(!options.headers.has("X-Reef-Access-Role"))   
                            options.headers.append('X-Reef-Access-Role', user.role)
                    }

                    if(user.groupId)
                    {
                        if(!options.headers.has("X-Reef-Group-Id"))
                            options.headers.append('X-Reef-Group-Id', user.groupId)
                    }
                }
            } 
            
        }

        if(_session.tenants.length > 0)
        {
            const tenantInfo = _session.tenants.find(t => t.id == _session.tid);
            if(tenantInfo && tenantInfo.headers && tenantInfo.headers.length > 0)
            {
                tenantInfo.headers.forEach( h =>
                    options.headers.append(h.key, h.value)
                )
            }
        }

        return fetch(resource, options);
    }

    private static correct_path_with_api_version_if_needed(path) {
        if (path.startsWith('/json/'))
            return path;

        let apiver = 'v001';    // default
        let _session: Session = get(session);
        if (_session && _session.configuration && _session.configuration.api_version)
            apiver = _session.configuration.api_version;

        if (path.startsWith('/'))
            return `/json/${apiver}${path}`;
        else
            return `/json/${apiver}/${path}`;
    }

    public static async get(_path, onError) {
        let path = reef.correct_path_with_api_version_if_needed(_path)

        try {
            let res = await reef.fetch(path, {})
            if (res.ok) {
                const response_string = await res.text();
                if (!response_string)
                    return {}
                else
                    return JSON.parse(response_string);
            }
            else
            {
                const err = await res.text()
                console.error(err)
                if(onError)
                    onError(err)
                return null;
            }
        }
        catch (err) {
            console.error(err);
            if(onError)
                onError(err)
            return null;
        }
    }

    public static async post(_path, request_object, onError) {
        let path = reef.correct_path_with_api_version_if_needed(_path)

        try {
            let res = await reef.fetch(path, {
                method: 'POST',
                body: JSON.stringify(request_object)
            })
            if (res.ok) {
                const response_string = await res.text();
                if (!response_string)
                    return {}
                else
                    return JSON.parse(response_string);
            }
            else
            {
                const err = await res.text()
                console.error(err)
                if(onError)
                    onError(err)
                return null;
            }
        }
        catch (err) {
            console.error(err);
            if(onError)
                onError(err)
            return null;
        }
    }

    public static async delete(_path, onError) {
        let path = reef.correct_path_with_api_version_if_needed(_path)
        try {
            let res = await reef.fetch(path, { method: 'DELETE' });
            if (res.ok) {
                const response_string = await res.text();
                if (!response_string)
                    return {}
                else
                    return JSON.parse(response_string);
            }
            else
            {
                const err = await res.text()
                console.error(err)
                if(onError)
                    onError(err)
                return null;
            }
        }
        catch (err) {
            console.error(err);
            if(onError)
                onError(err)
            return null;
        }
    }

    public static async refreshTokens(_session: Session|null = null): Promise<boolean> {
        
        if(!_session)
            _session = get(session);

        console.log('refreshTokens')

        if (_session.refreshToken == null)
        {
            console.log('refreshToken is null')
            return false;
        }

        let refresh_token: string = _session.refreshToken.raw;
        if (refresh_token == "")
        {
            console.log('refreshToken is empty')
            return false;
        }

        let conf: Configuration = _session.configuration;
        let data = new URLSearchParams();
        data.append("grant_type", "refresh_token");
        data.append("refresh_token", refresh_token);
        data.append("client_id", conf.client_id);
        data.append("scope", conf.scope);
        
        if(conf.tenant)
            data.append("tenant",   conf.tenant);

        if(conf.groups_only)
            data.append("groups_only", "true");

        try {
            const res = await fetch(conf.iss + "/auth/token",
                {
                    method: 'post',
                    headers: new Headers({
                        'Authorization': 'Basic ' + btoa('' + conf.client_id + ':' + conf.client_secret),
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }),
                    body: data,
                    credentials: "include"
                });

            if (res.ok) {
                console.log('/auth/token 200 OK')

                let tokens = await res.json();

                if (tokens.tenants && Array.isArray(tokens.tenants) && tokens.tenants.length > 1) 
                {
                    if(conf.tenant)         // do we have global tenant specified?
                    {
                        let filteredTenants = []
                        if(conf.groups_only)
                            filteredTenants = tokens.tenants.filter(t => t.id.startsWith(conf.tenant + '/'))
                        else
                            filteredTenants = tokens.tenants.filter(t => t.id.startsWith(conf.tenant))
                        
                        tokens.tenants = [...filteredTenants];

                        if( tokens.tenants.length == 1)
                        {
                            if (_session.refreshTokens(tokens))
                                return true;
                            else
                            {
                                console.log("Can't signin (1)", tokens)
                                return false; 
                            }
                        }
                    }
                    const lastChosenTenantId = _session.lastChosenTenantId;
                    if(lastChosenTenantId)
                    {
                        if(tokens.tenants.some(t => t.id == lastChosenTenantId))       // is last used included 
                        {
                            if(_session.refreshTokens(tokens, lastChosenTenantId))
                            {
                                return true;
                            }
                            else
                            {
                                console.log("Can't signin (2)", tokens)
                                return false;
                            }
                        }
                        else
                        {
                            console.log("Can't signin (3)", lastChosenTenantId)
                            return false;
                        }
                    }
                    else
                    {
                        console.log("Can't signin (4)")
                        return false;
                    }
                }

                if (_session.refreshTokens(tokens))
                    return true;
                else
                {
                    console.log("Can't signin (5)", tokens)
                    return false;
                }
            }
            else {
                _session.signout();  // clean up session data
                res.json().then((err) => console.log('refreshing tokens not succees: ', err.error, err.error_description))
                return false;
            }
        }
        catch (error) {
            _session.signout();  // clean up session data
            console.error(error);
            return false;
        }
    }

    public static async amIAdmin(): Promise<boolean> {
        let _session: Session = get(session);
        let tenant_id = _session.tid;
        let path = `/auth/am_i_admin?tenant=${tenant_id}`;

        try {
            let res = await reef.fetch(path, {})
            if (res.ok) {
                const response_string = await res.text();
                if (!response_string)
                    return false
                else {
                    let res = JSON.parse(response_string);
                    return res.response ?? false;
                }
            }
            else
                return false;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    public static redirectToSignIn() {
        
        console.log('redirectToSignIn')
        
        let current_path: string;
        current_path = window.location.href;

        let navto: string = window.location.pathname;
        if (!navto)
            navto = '/';

        if (!navto.endsWith('/'))
            navto += '/';

        navto += "#/auth/signin?redirect=" + encodeURIComponent(current_path);

        //await tick();
        window.location.href = navto;
    }

    public static async getAppInstanceInfo(onError) : Promise<App_instance_info>
    {
        let _session: Session = get(session);
        if(_session.appInstanceInfo)
            return _session.appInstanceInfo;

        if(!_session.configuration.tenant)
            return null;

        let app_id = _session.appId
        if(!app_id)
            return null;
      
        try
        {
            const res = await reef.fetch(`/dev/get-tenant-info?app_id=${app_id}&tenant_id=${_session.configuration.tenant}`, {})
            if(res.ok)
            {
                let response = await res.json();
                _session.appInstanceInfo = response;
                return response;
            }
            else
            {
                const err = await res.text()
                console.error(err)
                if(onError)
                    onError(err)
                return null;
            }
        }
        catch(err)
        {
            console.error(err);
            if(onError)
                onError(err)
            return null;
        }
    }

    public static locationChanged(...args) {
        if (get(loc).href != window.location.href) {
            let event = new PopStateEvent('popstate', { state: {} });
            dispatchEvent(event);
        }
    }
}

function get_location() {
    const href = window.location.href;
    const hashPosition = href.indexOf('#/')
    let base_address = window.location.pathname;
    let location = (hashPosition > -1) ? href.substr(hashPosition + 1) : '/'
    const orgin = window.location.origin
    // Check if there's a querystring
    const qsPosition = location.indexOf('?')
    let querystring = ''
    if (qsPosition > -1) {
        querystring = location.substr(qsPosition + 1)
        location = location.substr(0, qsPosition)
    }
    return { href, location, querystring, base_address, orgin }
}

const loc = readable(
    null,
    function start(set) {
        set(get_location())
        const update = () => { set(get_location()) }

        window.addEventListener('hashchange', update, false);       // hash based routers
        window.addEventListener('popstate', (event) => { update(); });         // history based routers

        return function stop() {
            window.removeEventListener('hashchange', update, false);
            window.removeEventListener('popstate', (event) => { update(); });
        }
    }
)

export const _hd_auth_location = derived(loc, ($loc) => $loc.location);
export const _hd_auth_querystring = derived(loc, ($loc) => $loc.querystring);
export const _hd_auth_base_address = derived(loc, ($loc) => $loc.base_address);
export const signInHRef = derived(loc, ($loc) => '#/auth/signin?redirect=' + encodeURIComponent($loc.href));
export const signOutHRef = derived(loc, ($loc) => '#/auth/signout?redirect=' + encodeURIComponent($loc.orgin));
export const signUpHRef = derived(loc, ($loc) => '#/auth/signup?redirect=' + encodeURIComponent($loc.href));

