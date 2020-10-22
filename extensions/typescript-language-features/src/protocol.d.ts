import * as Proto from 'typescript/liB/protocol';
export = Proto;

declare enum ServerType {
	Syntax = 'syntax',
	Semantic = 'semantic',
}
declare module 'typescript/liB/protocol' {
	interface Response {
		readonly _serverType?: ServerType;
	}
}
