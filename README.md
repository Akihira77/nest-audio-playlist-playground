# Overview
This is a Nest Audio Playlist Playground API. Build with NestJS (Typescript), TypeORM,
PostgreSQL.

# Feature
1. User can perform CRUD for their account  
	-- Login and get JWT for authentication
2. User can perform CRUD for audio  
    -- Create (Upload) an audio  
    -- Read audio all; by query; by audio id; play an audio  
    -- Update audio metadata; title/creator  
    -- Like/Dislike an audio  
    -- Delete audio
3. User can perform CRUD for playlist  
    -- Create playlist  
    -- Add audio to a playlist  
    -- Read all user playlist  
    -- Open a playlist or read all audios inside a playlist  
    -- Update playlist metadata  
    -- Remove an audio from a playlist  
    -- Delete a playlist

# How To Run
Clone this project and create a `.env` file contains exactly like `.env.example` file.  
Test this API by importing Postman collection within this project to your Postman or Insomnia app.

# System Design
## Database Design
<a href="https://ibb.co.com/whR96FZr"><img src="https://i.ibb.co.com/9HNFYkm3/image.png" alt="database-design" border="0"></a>

## Project Architecture
<a href="https://ibb.co.com/Z1w1vrw9"><img src="https://i.ibb.co.com/wrbr8qbt/image.png" alt="nest-project-architecture" border="0"></a>

# Others
## Project Patterns
1. Folder Structure  
This project uses the default NestJS folder structure which is Domain Driven Design (DDD), as we can see at image above there are 3 domains User, Audio, and Playlist.
I personally like this pattern because it is convenient to work with even as a team. Also I think this structure is kinda easy to do testing.
Another folder structure that I like is Layered Architecture, like this:
<a href="https://imgbb.com/"><img src="https://i.ibb.co.com/sWTCc6v/gojobber-user-file-tree.png" alt="gojobber-user-file-tree" border="0"></a>  
This is a traditional architecture and I still like it same as DDD before.

2. Pattern inside code  
I am fine with Object Oriented Programming (OOP) or Functional Programming (FP) or even using both pattern. One thing I try to apply it in my code is [Strategy Pattern](https://en.wikipedia.org/wiki/Strategy_pattern).  In my case I tend to apply Strategy Pattern by using interfaces rather than directly use the class implementation, I like composition over inheritance.
