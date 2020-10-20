import * As Proto from 'typescript/lib/protocol';
export = Proto;

declAre enum ServerType {
	SyntAx = 'syntAx',
	SemAntic = 'semAntic',
}
declAre module 'typescript/lib/protocol' {
	interfAce Response {
		reAdonly _serverType?: ServerType;
	}
}
