import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";



const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)

        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false}) // validate false because while saving all the validation checks will kick in , but we are sending only one field, it will raise error
return {
    accessToken,
    refreshToken
}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
        
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // steps
    // get user details from frontend     
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

    const existedUser =  await User.findOne({
        $or: [{email}, {userName}]
    })


    if(existedUser){
        throw new ApiError(409, "UserName or email already exist")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path; 
    // because cover image is not a required field
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0 ){
        coverImageLocalPath = req.files.coverImage[0].path

    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required ")
    }



    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if(!avatar){
        throw new ApiError(400, `Avatar is required: ${avatar}`)
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

const loginUser = asyncHandler(async (req, res) => {
    //steps
    // get field from frontend
    //get user with same email and name from the database
    // hash the password comming from frontend
    // math hashed passwrod
    // if password is correct, generate access and refresh token
    // send cookie

    const {userName, email, password} = req.body
    if(!userName && !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "incorrect password")
    }
    const {accessToken, refreshToken} =  await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("=password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,

    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User Logged in successfully"
        )
    )



})

const logoutUser = asyncHandler(async(req, res) => {
    
    await User.findByIdAndUpdate(
        req.body._id,
        {
            $unset:{
                refreshToken: 1 // this will remove refresh token from the document
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true,

    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, "user logged out successfully"))


    
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken           // this req.body.refreshToken is because someone might be using a our mobile application, which sends deata in body not in cookies

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised request")

    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
    
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh token is expired or used")
        }
    
        // agar yha tak aa gye to nye token bna do 
        const options = {
            httpOnly: true,
            secure: true,
    
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", newRefreshToken)
        .json(
            new ApiResponse(
                200,
                {accessToken , "refreshToken":newRefreshToken},
                "Access token refreshed"
    
            )
        )   
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
        
    }

    




    

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400, "wrong password")
    }
    user.password = newPassword
    user.save({validateBeforeSave: false})

    return res.status(200).json(
        new ApiResponse(200, {}, "password changes successfully")
    )

});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json( 
        new ApiResponse( 200, req.user, "curent user fetched successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "upload avatar")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

     if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar")
    }
    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, {user}, "avatar image updated successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "upload cover image file")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

     if(!coverImage.url){
        throw new ApiError(400, "Error while uploading avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, {user}, "coverImage updated successfully")
    )

})


const updateUserInfo = asyncHandler(async (req, res) =>{
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, {user}, "Account Details updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {userName} = req.params

    if(!userName?.trim()){
        throw new ApiError(400, "username is missing")
    }

    // now we make aggreate pipelines here
    // aggrigate takes an array which contain multiple objects which are different stages in pipeline

    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscriberToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName:1,
                userName:1,
                subscribersCount:1,
                channelsSubscriberToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,

            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400, "channel does not exist")
    
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )
})



const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match:{
                id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as:"watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField: "owner",
                            foreignField: "_id",
                            as:"owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName:1,
                                        userName:1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, user[0].watchhistory, "watch history fetched successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserInfo,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}


