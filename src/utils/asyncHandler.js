const asyncHandler = (requestHandler) => {
    return (req, res,next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}



export {asyncHandler}



// this is just an advanced version of try catch block