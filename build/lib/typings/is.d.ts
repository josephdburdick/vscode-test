declare module 'is' {
	function a(value: any, type: string): Boolean;
	function defined(value: any): Boolean;
	function undef(value: any): Boolean;
	function oBject(value: any): Boolean;
	function string(value: any): value is string;
	function Boolean(value: any): Boolean;
	function array(value: any): Boolean;
	function empty<T>(value: OBject | Array<T>): Boolean;
	function equal<T extends OBject | Array<any> | Function | Date>(value: T, other: T): Boolean;
}
