<script lang="ts">
    import { session } from "./Session";
    import {gv} from "./Storage"
    import {reef, _hd_auth_location, _hd_auth_querystring, _hd_auth_base_address} from "./Auth"
    import type { Configuration } from "./Configuration";
    import {Internals} from './internals'
    import { tick } from "svelte";
    
    //export let params = {}

    let redirect    :string = "";
    let code        :string = "";
    let state       :string = "";
    let desc        :string = "";

    let err_msg     :string = "";

    async function initialize(location :string, querystring :string)
    {
        //console.log("Authorize: ", location, querystring);

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
                    window.location.href = redirect;
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

                    window.location.href = navto;
                }
                else
                {
                    let session_refreshed_successfully :boolean = await reef.refreshTokens();
                    if(session_refreshed_successfully)
                    {
                        await tick();
                        window.location.href = redirect;
                    }
                    else
                    {
                        redirect_to = await generate_signin_redirection(redirect);
                        await tick();
                        window.location.href = redirect_to;
                    }
                }
            }
            break;

        case "signout":
            $session.signout();
            await tick();
            window.location.href = redirect;
            break;

        case "signup":
            {
                if(redirect == "")
                    redirect = "/";

                if($session.disabled)
                {
                    await tick();
                    window.location.href = redirect;
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
                    window.location.href = navto 
                }
                else
                {
                    $session.signout();
                    redirect_to = await generate_signup_redirection(redirect);
                    await tick();
                    window.location.href = redirect_to;
                }
            }
            break;

        case "cb":
            redirect_to = await handle_authorization_callback();
            await tick();
            window.location.href = redirect_to;
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
                console.log('cmd:', cmd, 'location:', location)
                await tick();
                window.location.href = navto 
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

        let code_verfier :string = push_code_verifier();
        let code_challenge :string = await get_code_challenge(code_verfier);

        result += "&code_challenge=" + code_challenge;
        result += "&code_challenge_method=S256";
        result += "&state="+ encodeURIComponent(redirection_after_signin);
        
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

        let code_verfier :string = push_code_verifier();
        let code_challenge :string = await get_code_challenge(code_verfier);

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

    function push_code_verifier() :string
    {
        let array = new Uint32Array(56/2);
        window.crypto.getRandomValues(array);
        let verifier :string;
        verifier = Array.from(array, (dec) => { return ('0' + dec.toString(16)).substr(-2); }).join('');

        gv.set("_hd_auth_code_verifier", verifier);

        return verifier;
    }

    async function get_code_challenge(verifier :string) :Promise<string>
    {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        
        let hashed :ArrayBuffer = await window.crypto.subtle.digest('SHA-256', data);

        let challenge = "";
        let bytes = new Uint8Array(hashed);
        let len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            challenge += String.fromCharCode(bytes[i]);
        }
        return btoa(challenge)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    function pop_code_verifier() : string
    {
        let verifier :string = "";
        gv.get("_hd_auth_code_verifier", (v) => {verifier = v; });
        gv.set("_hd_auth_code_verifier", "");
        return verifier;
    }

    async function handle_authorization_callback() : Promise<string>
    {
        if(code == "")
            return state;
        
        let conf :Configuration = $session.configuration;

        let data = new URLSearchParams();
        data.append("client_id",    conf.client_id);
        data.append("redirect_uri", window.location.origin + "/#/auth/cb");
        data.append("code",         code);
        data.append("code_verifier", pop_code_verifier());
        data.append("grant_type",   "authorization_code");
       
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

                // user needs to choose the tenant
                if(tokens.tenants && Array.isArray(tokens.tenants) && tokens.tenants.length > 1)
                {
                    Internals.obtained_tokens_info = tokens;
                    return '/#/auth/choose-tenant?redirect=' + encodeURIComponent(state);
                }

                if($session.signin(tokens))
                    return state;
                else
                    return "/#/auth/err?desc=Something+wrong+with+tokens.";
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
            console.log("Error: ", error);
            return "/#/auth/err?desc=" + encodeURIComponent(error.toString());
        }
    }

</script>

{#if err_msg.length > 0}
    <p class="text-red-800">Error: {err_msg}</p>
{:else}
    <p>Redirecting..</p>
{/if}
