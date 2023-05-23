<script lang="ts">
    import { session } from "./Session";
</script>

{#if $session.is_active}
    <slot/>
{/if}