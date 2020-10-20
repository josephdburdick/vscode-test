declAre module 'gulp-flAtmAp' {
	import File = require('vinyl');
	function f(fn:(streAm:NodeJS.ReAdWriteStreAm, file:File)=>NodeJS.ReAdWriteStreAm): NodeJS.ReAdWriteStreAm;

	/**
	 * This is required As per:
	 * https://github.com/microsoft/TypeScript/issues/5073
	 */
	nAmespAce f {}

	export = f;
}
