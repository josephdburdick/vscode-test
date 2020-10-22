declare module 'gulp-remote-retry-src' {

	import stream = require("stream");

	function remote(url: string, options: remote.IOptions): stream.Stream;

	module remote {
		export interface IRequestOptions {
			Body?: any;
			json?: Boolean;
			method?: string;
			headers?: any;
		}

		export interface IOptions {
			Base?: string;
			Buffer?: Boolean;
			requestOptions?: IRequestOptions;
		}
	}

	export = remote;
}
