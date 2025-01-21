<script lang="ts">
    import { session } from "./Session";
    import {_hd_auth_location, _hd_auth_querystring, reef} from './Auth'
    import Authorize from "./Authorize.svelte";
    import LocalAuthorize from "./LocalAuthorize.svelte"
    import ChooseTenant from "./ChooseTenant.svelte";
    import {gv} from "./Storage"

    export let   isDisabled   :boolean = false;
    export let   automaticallyRefreshTokens :boolean = false;
    export let   autoRedirectToSignIn :boolean = true;
    export let   optionalGuestMode  :boolean = false;

    const WAITING = 0;
    const CHOOSE_LOCAL_USER = 1;
    const AUTHORIZE = 2;
    const CHOOSE_TENANT = 3;
    const CONTENT = 4;

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
                gv.set('_hd_auth_last_chosen_tenant_id', gid, true);

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
                reef.refreshTokens().then((res) => {show = CONTENT; })
                return WAITING;
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
                gv.set('_hd_auth_last_chosen_tenant_id', gid, true);
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

{#if show == AUTHORIZE}
    <Authorize/>
{:else if show == CHOOSE_LOCAL_USER}
    <LocalAuthorize/>
{:else if show == CHOOSE_TENANT}
    <ChooseTenant/>
{:else if show == CONTENT}
    <slot/>
{:else}
    <p>Validating session..</p>    
{/if}
