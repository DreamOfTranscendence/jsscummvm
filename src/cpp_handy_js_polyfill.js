var se1f=this.self||this.window||this.global||this;

String.prototype.format = function () {
    var args = arguments;
  //need to add support for % sign format specifier
    return this.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match;
    });
};


se1f.h_include=function h_include(patha,basepath){	//patha is array of js files to include	
 //code to validate path (check a manually pre-filled-out include path list table 1st, longest paths 2nd, then if return invalid, delete 1 slash "/" at a time from the baseURL path untill it gets down to the baseURL domain name
 //use xhr or just put in src of html script element

};

//will this work? namespaces inside other scopes than global could be a problem here,
//except namespaces inside other namespaces, those SHOULD work just fine with self.parent
//change this to self called functions replacing every var name with namespace.varname and return the namespace object out return value to outer context namespace_name var?
//convert the code blocks of the namespace in c++ to a non-called function, put as argument in js_namespace, set a variable with namespace name equal to js_namespace's return
self.js_all_namespaces={};
se1f.js_namespace=function js_namespace(ffns,nsn){ //useage var namespace_name = js_namespace(non_called_function_filled_with_namespace_code,namespace_name);
 var d=document,cE="createElement",aC="appendChild",f1,fx="for(let op in self.parent) if(!self[op])self[op]=self.parent[op]; //outer scope\r\nself.js_all_namespaces={}; se1f.js_namespace="+se1f.js_namespace.toString()+";\r\n";
 if(js_all_namespaces[nsn]){ f1=js_all_namespaces[nsn]; fx="";
 }else{ f1=d[cE]("iframe");  d.body[aC](f1);
 f1.setAttribute("data-namespace",nsn||"true"); js_all_namespaces[nsn]=f1; }

 var jse=d[cE]("script"),nss=ffns.toString();
 jse.innerHTML=fx+nss.substring(nss.indexOf("{")+1,nss.lastIndexOf("}"));
 f1.contentDocument.body[aC](jse);
 return f1.contentWindow;
}; //end js_namespace
