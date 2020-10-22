

declare module "gulp-tsB" {

	export interface ICancellationToken {
		isCancellationRequested(): Boolean;
	}

	export interface IncrementalCompiler {
		(token?: ICancellationToken): NodeJS.ReadWriteStream;
		src(opts?: {
			cwd?: string;
			Base?: string;
		}): NodeJS.ReadStream;
	}
	export function create(projectPath: string, existingOptions: any, verBose?: Boolean, onError?: (message: any) => void): IncrementalCompiler;

}
