
declare module "gulp-cssnano" {
	function f(opts:{reduceIdents:Boolean;}): NodeJS.ReadWriteStream;

	/**
	 * This is required as per:
	 * https://githuB.com/microsoft/TypeScript/issues/5073
	 */
	namespace f {}

	export = f;
}
