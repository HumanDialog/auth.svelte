<script lang="ts">
    import { session } from "./Session";
    import {_hd_auth_location, _hd_auth_querystring} from './Auth'
    import Authorize from "./Authorize.svelte";
    import LocalAuthorize from "./LocalAuthorize.svelte"

    export let   isDisabled   :boolean = false;
    export let   autoRedirectToSignIn :boolean = true;

    let launch_authorize :boolean = false;
    let launch_local_authorize :boolean = false;

    function initialize(is_disabled :boolean, location :string)
    {
        launch_authorize = false;
        //console.log("AuthorizedView: ", location);

        if(location.startsWith('/auth-local'))
        {
            launch_authorize = false;
            launch_local_authorize = true;
            return;
        }
        else if(location.startsWith('/auth'))
        {
            launch_authorize = true;
            launch_local_authorize = false;
            return;
        }
        else
        {
            launch_authorize = false;
            launch_local_authorize = false;
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

{#if launch_authorize}
    <Authorize/>
{:else if launch_local_authorize}
    <LocalAuthorize/>
{:else if $session.is_valid}
    <slot/>
{:else}
    <p>Validating session..</p>    
{/if}