<script lang="ts">
    import { session } from "./Session";
    import {_hd_auth_location, _hd_auth_querystring} from './Auth'
    import Authorize from "./Authorize.svelte";
    import LocalAuthorize from "./LocalAuthorize.svelte"
    import ChooseTenant from "./ChooseTenant.svelte";

    export let   isDisabled   :boolean = false;
    export let   autoRedirectToSignIn :boolean = true;

    const WAITING = 0;
    const CHOOSE_LOCAL_USER = 1;
    const AUTHORIZE = 2;
    const CHOOSE_TENANT = 3;

    let what_to_show :number = WAITING;

    function initialize(is_disabled :boolean, location :string)
    {
        if(location.startsWith('/auth-local'))
        {
            what_to_show = CHOOSE_LOCAL_USER;
            return;
        }
        else if(location.startsWith('/auth/choose-tenant'))
        {
            what_to_show = CHOOSE_TENANT;
            return;
        }
        else if(location.startsWith('/auth'))
        {
            what_to_show = AUTHORIZE;
            return;
        }
        else
        {
            what_to_show = WAITING;
        }

        //if(is_disabled)
        //    $session.set_disabled(true);
        
        if(!$session.is_active)       // validates here
        {
            if(autoRedirectToSignIn)
            {
                let current_path :string;
                current_path = window.location.href;
                
                let navto :string = "#/auth/signin?redirect=" + encodeURIComponent(current_path);
                window.location.hash = navto;
            }
        }
    }

    $: initialize(isDisabled, $_hd_auth_location);

    
</script>

{#if what_to_show == AUTHORIZE}
    <Authorize/>
{:else if what_to_show == CHOOSE_LOCAL_USER}
    <LocalAuthorize/>
{:else if what_to_show == CHOOSE_TENANT}
    <ChooseTenant/>
{:else if $session.is_valid}
    <slot/>
{:else}
    <p>Validating session..</p>    
{/if}