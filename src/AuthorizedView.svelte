<script lang="ts">
    import { session } from "./Session";
    import {_hd_auth_location, _hd_auth_querystring, reef} from './Auth'
    import Authorize from "./Authorize.svelte";
    import LocalAuthorize from "./LocalAuthorize.svelte"
    import ChooseTenant from "./ChooseTenant.svelte";
    import { tick } from "svelte";

    export let   isDisabled   :boolean = false;
    export let   autoRedirectToSignIn :boolean = true;

    const WAITING = 0;
    const CHOOSE_LOCAL_USER = 1;
    const AUTHORIZE = 2;
    const CHOOSE_TENANT = 3;
    const CONTENT = 4;

    function what_to_show(...args) :number
    {
        let location = $_hd_auth_location;

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
            return CONTENT;
        }
        else if(autoRedirectToSignIn)
        {
            setTimeout( () => reef.redirectToSignIn(), 100);
            return WAITING;
        }
        else
        {
            return CONTENT;
        }

    }

    $: show = what_to_show($session, $_hd_auth_location);
        
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
