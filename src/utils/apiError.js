// this is so that agar aage koi api errors aaye hamare pass to isi format me aayenge

class ApiError extends Error{
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = null
        this.success = false
        this.errors = errors

        if(statck){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor )
        }
    }
}

export {ApiError}
