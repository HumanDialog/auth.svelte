<script lang="ts">
    import { session } from "./Session";
</script>

{#if !$session.isActive}
    <slot/>
{/if}