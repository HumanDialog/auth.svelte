<script lang="ts">
    import { session as _session} from "./Session";
    import {_hd_auth_location, _hd_auth_querystring, reef} from './Auth'
    import Authorize from "./Authorize.svelte";
    import LocalAuthorize from "./LocalAuthorize.svelte"
    import ChooseTenant from "./ChooseTenant.svelte";
    import {gv} from "./Storage"
    import {getContext, setContext} from 'svelte'

    export let   isDisabled   :boolean = false;
    export let   automaticallyRefreshTokens :boolean = false;
    export let   autoRedirectToSignIn :boolean = true;
    export let   optionalGuestMode  :boolean = false;

    export let   layoutTheme: string = ''
    export let   layoutClass: string = ''
    export let   buttonClass: string = ''
    export let   normalTextClass: string = ''
    export let   errorTextClass: string = ''

    const WAITING = 0;
    const CHOOSE_LOCAL_USER = 1;
    const AUTHORIZE = 2;
    const CHOOSE_TENANT = 3;
    const CONTENT = 4;

    const storage = gv;
    const session = _session;

    if(layoutClass)
        setContext('__hd_auth_layout_class', layoutClass)

    if(buttonClass)
        setContext('__hd_auth_button_class', buttonClass)

    if(normalTextClass)
        setContext('__hd_auth_normal_text_class', normalTextClass)

    if(errorTextClass)
        setContext('__hd_auth_error_text_class', errorTextClass)

    

    $: show = what_to_show($session, $_hd_auth_location);

    function what_to_show(...args) :number
    {
        let location = $_hd_auth_location;

        let params = new URLSearchParams($_hd_auth_querystring);
        const gid =   params.has('gid') ? params.get('gid') : '';

        if(optionalGuestMode)
        {
            if($session.isUnauthorizedGuest)
                return CONTENT;
        }
        
        if(isDisabled)
        {
            return CONTENT;
        }
        else if(location.startsWith('/auth-local'))
        {
           return CHOOSE_LOCAL_USER;
        }
        else if(location.startsWith('/auth/choose-tenant'))
        {
            return CHOOSE_TENANT;
        }
        else if(location.startsWith('/auth'))
        {
            return AUTHORIZE;
        }
        else if($session.isActive)
        {
            if(false && gid && $session.tid != gid)
            {
                storage.set('_hd_auth_last_chosen_tenant_id', gid, true);

                const tInfo = $session.tenants.find(t => t.id == gid)
                if(tInfo)
                {
                    $session.setCurrentTenantAPI(tInfo.url, tInfo.id); 
                }
                else
                {
                    setTimeout( () => reef.redirectToSignIn(), 100);
                    return WAITING;
                }
            }

            return CONTENT;
        }
        else if(automaticallyRefreshTokens)
        {
            if($session?.refreshToken?.raw)
            {
                console.log('sessionId 2:', $session.sessionId)
                reef.refreshTokens().then((res) => 
                {
                    if(!res)
                    {
                        if(autoRedirectToSignIn)  
                            setTimeout( () => reef.redirectToSignIn(), 100);
                        else
                        {
                            $session.signout();
                            setTimeout( () => {window.location.href = '/'}, 100);
                        }
                    }
                    else
                    {
                        show = CONTENT; 
                    }
                })

                return WAITING; //CONTENT ?
            }
            else
            {
                return CONTENT;
            }
        }
        else if(autoRedirectToSignIn)
        {
            if(false && gid)
            {
                storage.set('_hd_auth_last_chosen_tenant_id', gid, true);
            }
            
            setTimeout( () => reef.redirectToSignIn(), 100);
            return WAITING;
        }
        /*else if(landingForUnauthorized)
        {
            return CONTENT
        }
        */else
        {
            return CONTENT;
        }

    }

    
        
</script>

{#if show == CONTENT}
    <slot/>
{:else}
    <div class="{layoutTheme}">
        <div class="{layoutClass}">

        {#if show == AUTHORIZE}
            <Authorize/>
        {:else if show == CHOOSE_LOCAL_USER}
            <LocalAuthorize/>
        {:else if show == CHOOSE_TENANT}
            <ChooseTenant/>
        {:else}
            <p class="{normalTextClass}">
                Validating session..
            </p>    
        {/if} 

        </div>
    </div>
{/if}



