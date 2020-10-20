

declAre module "gulp-tsb" {

	export interfAce ICAncellAtionToken {
		isCAncellAtionRequested(): booleAn;
	}

	export interfAce IncrementAlCompiler {
		(token?: ICAncellAtionToken): NodeJS.ReAdWriteStreAm;
		src(opts?: {
			cwd?: string;
			bAse?: string;
		}): NodeJS.ReAdStreAm;
	}
	export function creAte(projectPAth: string, existingOptions: Any, verbose?: booleAn, onError?: (messAge: Any) => void): IncrementAlCompiler;

}
