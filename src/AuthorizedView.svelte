<script lang="ts">
    import { session } from "./Session";
    import {_hd_auth_location, _hd_auth_querystring} from './Auth'
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
        console.log("what_to_show")
        let location = $_hd_auth_location;

        if(isDisabled)
        {
            console.log("what_to_show / disabled")
            return CONTENT;
        }
        else if(location.startsWith('/auth-local'))
        {
            console.log("what_to_show auth-local")
           return CHOOSE_LOCAL_USER;
        }
        else if(location.startsWith('/auth/choose-tenant'))
        {
            console.log("what_to_show choose-tenant")

            return CHOOSE_TENANT;
        }
        else if(location.startsWith('/auth'))
        {
            console.log("what_to_show auth")

            return AUTHORIZE;
        }
        else if($session.is_active)
        {
            console.log("what_to_show is active")
            return CONTENT;
        }
        else if(autoRedirectToSignIn)
        {
            console.log("what_to_show not active -> redirect")
            redirect_to_sign_in_page();
            return WAITING;
        }
        else
        {
            console.log("what_to_show not active, let show not authorized views")
            return CONTENT;
        }

    }

    function redirect_to_sign_in_page()
    {
        let current_path :string;
        current_path = window.location.href;

        //console.log('auth, location.pathname', window.location.pathname)
        let navto :string = window.location.pathname;
        if(!navto)
            navto = '/';

        if(!navto.endsWith('/'))
            navto += '/';

        navto += "#/auth/signin?redirect=" + encodeURIComponent(current_path);

        //console.log('auth, navto', navto)
        //await tick();
        window.location.href = navto;
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
