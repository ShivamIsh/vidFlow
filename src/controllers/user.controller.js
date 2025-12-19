import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
    // steps
    // get user details from frontend     done
    // validation - not empty               done
    // check if user already exist : username and email
    // check for images, check for avatar
    // upload them to cloudinary
    // check if uloaded on cloudinary
    // create user object - create entry in db
    // remove password and refresh token foels from response
    //check for user creation 
    // return response 

    const {fullName, email, userName, password} = req.body
    console.log("email: ", email);

    if(
        [fullName, email, userName, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser =  User.findOne({
        $or: [{email}, {userName}]
    })


    if(existedUser){
        throw new ApiError(409, "UserName or email already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    if(!createdUser){
        throw new ApiError(500, "somthing went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user Registered Successfully")
    )













    


    
})



export {
    registerUser
}
