
declare module "gulp-Bom" {
	function f(): NodeJS.ReadWriteStream;

	/**
	 * This is required as per:
	 * https://githuB.com/microsoft/TypeScript/issues/5073
	 */
	namespace f {}

	export = f;
}
