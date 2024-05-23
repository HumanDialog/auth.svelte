<script lang="ts">
    import { session } from "./Session";
    import {Internals} from "./internals"
    import {_hd_auth_location, _hd_auth_querystring} from "./Auth"
    import {tick} from 'svelte'
    import { gv } from "./Storage";

    let redirect;
    let tenants = [];
    let tokens_info;

    $: initialize($_hd_auth_location, $_hd_auth_querystring);

    async function initialize(location, querystring)
    {
        let args = new URLSearchParams(querystring);
        redirect =   args.has("redirect")   ?   args.get("redirect")    : "";

        if(!redirect)
            return await error("Parameter 'redirect' not specified")

        tokens_info = Internals.obtained_tokens_info;
        if(!tokens_info)
            return await error("Unknown tokens info");

        let tenants_info = tokens_info.tenants;
        if( tenants_info && Array.isArray(tenants_info) && tenants_info.length > 0)
            tenants = tenants_info;
        else
            return await error("Tenants list not specified in resulted tokens info")
    }

    async function select_tenant(tenant)
    {
        if($session.signin(tokens_info, tenant.id))
        {
            gv.set('_hd_auth_last_chosen_tenant_id', tenant.id, false); //$session.configuration.refresh_token_persistent)
            await tick();
            window.location.href = redirect;
        }
        else
            await error("Something wrong with tokens");
    }

    async function error(msg)
    {
        await tick();
        window.location.href = "/#/auth/err?desc=" + encodeURIComponent(msg);
        return msg;
    }
</script>



<div class="flex flex-col items-center mt-0 sm:mt-10 ">
    <div class="w-full pt-2 pb-6 bg-zinc-100 rounded-lg shadow dark:border md:mt-0 sm:max-w-md dark:bg-zinc-700 bg-opacity-75">
        <div class="flex flex-col items-center">
            <h1 class="mb-1 text-xl leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white font-normal">What tenant would you like to sign in?</h1>
            <hr class="min-w-full border-1 border-zinc-400 opacity-75">

            {#each tenants as tenant}
                <button     type="button" 
                            on:click={() => { select_tenant(tenant) }} 
                            class=" mt-2 px-5 py-2.5 mr-2 mb-2  
                                    text-white
                                    bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700
                                    focus:outline-none  focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800
                                    font-medium text-sm
                                    rounded-lg"
                            >
                    {#if tenant.name}
                        {tenant.name}
                    {:else}
                        {tenant.id}
                    {/if}
                </button>
            {/each}
        </div>
    </div>
</div>
