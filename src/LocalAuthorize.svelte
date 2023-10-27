<script lang="ts">
    import { session } from "./Session";
    import {_hd_auth_location, _hd_auth_querystring} from "./Auth"
    import {tick} from 'svelte'
    

    let redirect :string = "";

    $:
    {
        let args = new URLSearchParams($_hd_auth_querystring);
        redirect =   args.has("redirect")   ?   args.get("redirect")    : "";
    }

    async function signin_local_user(user :string)
    {
        $session.set_local_dev_current_user(user);
        if(redirect)
        {
            await tick();
            window.location.href = redirect;
        }
    }

</script>


<div class="flex flex-col items-center mt-0 sm:mt-10 ">
    <div class="w-full pt-2 pb-6 bg-zinc-100 rounded-lg shadow dark:border md:mt-0 sm:max-w-md dark:bg-zinc-700 bg-opacity-75">
        <div class="flex flex-col items-center">
            <h1 class="mb-1 text-xl leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white font-normal">Local sign in </h1>
            <hr class="min-w-full border-1 border-zinc-400 opacity-75">
            
            {#each $session.configuration.local_users as user}
                <button type="button" on:click={() => { signin_local_user(user) }} class="mt-2 focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
                    {user}
                </button>
            {/each}
        </div>
    </div>
</div>