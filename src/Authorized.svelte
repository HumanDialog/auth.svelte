<script lang="ts">
    import { session as _session } from "./Session";

    const session = _session;
</script>

{#if $session.isActive || $session.isUnauthorizedGuest}
    <slot/>
{/if}