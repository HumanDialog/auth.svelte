<script lang="ts">
    import { session } from "./Session";
</script>

{#if !$session.isActive && !$session.isUnauthorizedGuest}
    <slot/>
{/if}