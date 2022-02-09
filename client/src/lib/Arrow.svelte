<script>
	export let left = false;
</script>

<svg class:left on:click xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
	<path fill="#5286fa" d="M226 115.4a23.3 23.3 0 00-33 33L300.7 256 193 363.7a23.3 23.3 0 1033 32.9l124-124.1a23.3 23.3 0 000-33l-124-124z"/>
</svg>

<style>
	svg {
		width: 1.5rem;
		height: 1.5rem;
    margin-left: 0.75rem;
    margin-right: 0.75rem;
		cursor: pointer;
	}
	
	.left {
		transform: rotateY(180deg);
	}
</style>