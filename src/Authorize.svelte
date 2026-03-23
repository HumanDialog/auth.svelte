<script lang="ts">
    import { session as _session, Session } from "./Session";
    import {gv} from "./Storage"
    import {reef, _hd_auth_location, _hd_auth_querystring, _hd_auth_base_address} from "./Auth"
    import type { Configuration } from "./Configuration";
    import {Internals} from './internals'
    import { tick, getContext, hasContext } from "svelte";
    
    //export let params = {}

    let redirect    :string = "";
    let code        :string = "";
    let state       :string = "";
    let desc        :string = "";
    let asGuest     :boolean = false;

    let err_msg     :string = "";

    let normalTextClass :string = ''
    if(hasContext('__hd_auth_normal_text_class'))
        normalTextClass = getContext('__hd_auth_normal_text_class')

    let errorTextClass :string = 'text-red-800'
    if(hasContext('__hd_auth_error_text_class'))
        errorTextClass = getContext('__hd_auth_error_text_class')

    const storage = gv;
    const session = _session;

    async function initialize(location :string, querystring :string)
    {
        let segments :string[] = location.split('/');
        if(segments.length <= 1)
            return;

        const last_segment = segments[segments.length - 1];
        let cmd :string = last_segment;
        
        let args = new URLSearchParams(querystring);
        redirect =   args.has("redirect")   ?   args.get("redirect")    : "";
        code =       args.has("code")       ?   args.get("code")        : "";
        state =      args.has("state")      ?   args.get("state")       : "";
        desc =       args.has("desc")       ?   args.get("desc")        : "";
        asGuest =    args.has("guest") ? true : false;

        if(redirect.startsWith('#'))
            redirect = redirect.slice(1);

        err_msg = "";

        let redirect_to  :string = "/";
        switch(cmd)
        {
        case "signin":
            {
                if(redirect == "")
                    redirect = "/";

                if($session.disabled)
                {
                    await tick();
                    window.location.replace(redirect);
                }
                else if($session.local)
                {
                    let navto :string = window.location.pathname;
                    if(!navto)
                        navto = '/';

                    if(!navto.endsWith('/'))
                        navto += '/';

                    navto += "#/auth-local?redirect=" + encodeURIComponent(redirect);
                    await tick();

                    window.location.replace(navto);
                }
                else
                {
                    let session_refreshed_successfully :boolean = false;
                    if($session?.refreshToken?.raw)
                        session_refreshed_successfully =  await reef.refreshTokens();
                    
                    if(session_refreshed_successfully)
                    {
                        await tick();
                        window.location.replace(redirect);
                    }
                    else
                    {
                        redirect_to = await generate_signin_redirection(redirect);
                        await tick();
                        window.location.replace(redirect_to);
                    }
                }
            }
            break;

        case "signout":
            $session.signout();
            await tick();
            window.location.replace(redirect);
            break;

        case "signup":
            {
                if(redirect == "")
                    redirect = "/";

                if($session.disabled)
                {
                    await tick();
                    window.location.replace(redirect);
                }
                else if($session.local)
                {
                    let navto :string = window.location.pathname;
                    if(!navto)
                        navto = '/';

                    if(!navto.endsWith('/'))
                        navto += '/';

                    navto += "#/auth/err?desc=Signup+is+not+supported+in+local+environment"
                    await tick();
                    window.location.replace(navto) 
                }
                else
                {
                    $session.signout();
                    redirect_to = await generate_signup_redirection(redirect);
                    await tick();
                    window.location.replace(redirect_to);
                }
            }
            break;

        case "cb":
            redirect_to = await handle_authorization_callback();
            await tick();
            window.location.replace(redirect_to);
            
            break;

        case "err":
            err_msg = desc;
            break;

        default:
            {
                let navto :string = window.location.pathname;
                if(!navto)
                    navto = '/';

                if(!navto.endsWith('/'))
                    navto += '/';

                navto += "#/auth/err?desc=Bad+request:+"    + encodeURIComponent(window.location.href) 
                                                            + '+cmd:+'+encodeURIComponent(cmd)
                                                            + '+location:+'+encodeURIComponent(location)
                await tick();
                window.location.replace(navto) 
            }
            
            break;
        }

    }

    $: initialize($_hd_auth_location, $_hd_auth_querystring);

    async function generate_signin_redirection(redirection_after_signin :string) : Promise<string>
    {
        let conf = $session.configuration;
        
        let result :string;
        result = conf.iss + "/auth/authorize";
        result += "?redirect_uri=" + encodeURIComponent(window.location.origin + "/#/auth/cb");
        result += "&scope=" + encodeURIComponent(conf.scope);
        result += "&grant_type=code";
        result += "&client_id=" + conf.client_id;

        if(conf.tenant)
            result += "&tenant=" + conf.tenant;

        if(conf.ask_organization_name)
            result += "&org_name=true" 

        if(conf.groups_only)
            result += "&groups_only=true"

        let code_verfier :string = $session.push_code_verifier();
        let code_challenge :string = await $session.get_code_challenge(code_verfier);

        result += "&code_challenge=" + code_challenge;
        result += "&code_challenge_method=S256";
        result += "&state="+ encodeURIComponent(redirection_after_signin);

        if(conf.terms_and_conditions_href)
            result += "&terms=" + encodeURIComponent(conf.terms_and_conditions_href);

        if(conf.privacy_policy_href)
            result += "&privacy=" + encodeURIComponent(conf.privacy_policy_href); 
        
        return result;
    }

    async function generate_signup_redirection(redirection_after_signin :string) : Promise<string>
    {
        let conf = $session.configuration;
        
        let result :string;
        result = conf.iss + "/auth/authorize";
        result += "?redirect_uri=" + encodeURIComponent(window.location.origin + "/#/auth/cb");
        result += "&scope=" + encodeURIComponent(conf.scope);
        result += "&grant_type=code";
        result += "&client_id=" + conf.client_id;
        
        if(conf.tenant)
            result += "&tenant=" + conf.tenant;

        if(conf.ask_organization_name)
            result += "&org_name=true"

        if(conf.groups_only)
            result += "&groups_only=true"

        let code_verfier :string = $session.push_code_verifier();
        let code_challenge :string = await $session.get_code_challenge(code_verfier);

        result += "&code_challenge=" + code_challenge;
        result += "&code_challenge_method=S256";
        result += "&state="+ encodeURIComponent(redirection_after_signin);

        result += "&is_signup=true";

        if(conf.terms_and_conditions_href)
            result += "&terms=" + encodeURIComponent(conf.terms_and_conditions_href);

        if(conf.privacy_policy_href)
            result += "&privacy=" + encodeURIComponent(conf.privacy_policy_href); 
        
        return result;
    }

    

    async function handle_authorization_callback() : Promise<string>
    {
        if(asGuest)
        {
            $session.isUnauthorizedGuest = true;
            return state;
        }

        if(code == "")
            return state;
        
        let conf :Configuration = $session.configuration;

        let data = new URLSearchParams();
        data.append("client_id",    conf.client_id);
        data.append("redirect_uri", window.location.origin + "/#/auth/cb");
        data.append("code",         code);
        data.append("code_verifier", $session.pop_code_verifier());
        data.append("grant_type",   "authorization_code");

        if(conf.tenant)
            data.append("tenant",   conf.tenant);

        if(conf.groups_only)
            data.append("groups_only", "true");
       
        try
        {
            const  res = await fetch(  conf.iss + "/auth/token",
                                    {
                                        method: 'post',
                                        headers : new Headers({
                                            'Content-Type': 'application/x-www-form-urlencoded',
                                            'Accept': 'application/json'}),
                                        body : data,
                                        credentials: "include"
                                    });

            if(res.ok)
            {
                let tokens = await res.json();

                switch($session.useTokensToSignIn(tokens))
                {
                case Session.SIGNIN_SUCCESS:
                    return state;

                case Session.SIGNIN_CHOOSE_TENANT:
                    return '/#/auth/choose-tenant?redirect=' + encodeURIComponent(state);

                case Session.SIGNIN_FAILED:
                    return "/#/auth/err?desc=Something+wrong+with+tokens."
                }
            }
            else
            {
                const result = await res.json();    
                let msg = (!!result.error_description) ? result.error_description : "";
                if(msg == "")
                    msg = (!!result.error) ? result.error : "";

                return "/#/auth/err?desc=" + encodeURIComponent(msg);

            }
        }
        catch (error)
        {
            console.error(error);
            return "/#/auth/err?desc=" + encodeURIComponent(error.toString());
        }
    }

</script>

{#if err_msg.length > 0}
    <p class="{errorTextClass}">
        Error: {err_msg}
        <br/>
        <a href="/" class="underline text-sm font-semibold cursor-pointer text-stone-900 dark:text-white">Reload page</a>
    </p>
    
{:else}
    <p class="{normalTextClass}">Redirecting..</p>
{/if}
