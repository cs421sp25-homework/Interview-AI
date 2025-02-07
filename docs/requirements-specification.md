# Software Requirement Specification

## Problem Statement  
In today's competitive job market, interviews are a crucial hurdle for candidates across a wide range of industries—including computer science, business, consulting, and more. Preparing for these interviews is often a challenging process. Traditional preparation methods—such as practicing random technical or case problems, reading interview guides, or scheduling mock sessions with peers—tend to lack personalization and meaningful feedback.

Many candidates struggle to identify their weaknesses, enhance their problem-solving skills, and build the confidence necessary to excel during interviews. Furthermore, real-world interview scenarios typically involve a blend of technical, situational, and behavioral questions that require a structured approach to preparation—one that closely simulates actual interview conditions.

Without a personalized, interactive, and adaptive preparation tool, candidates across various fields may find themselves unprepared for the specific challenges of their interviews, ultimately leading to missed opportunities in securing the positions they aspire to.


## Proposed Solution
The proposed **AI-powered mock interview app** solves this problem by providing a **resume-based, interactive interview experience** tailored to each user's background and skills. Users can **upload their resumes**, and the AI will analyze their skills to generate **custom technical and behavioral questions** based on their experience. The app allows users to answer questions using **text or voice**, mimicking real interview scenarios. It also provides **instant AI-based feedback** on correctness, clarity, and communication skills.

### Features:
- **Automatic scoring and feedback** to highlight strengths and weaknesses.
- **Follow-up questions** to simulate real interviewer interactions.
- **Performance tracking and personalized study tips** to help users improve over time.

By offering **on-demand, data-driven, and AI-enhanced interview preparation**, this solution helps candidates refine their responses, boost their confidence, and maximize their chances of success in real technical interviews.

## Potential Clients
**Interviewees**: Individuals preparing for potential interviews, both **behavioral and technical**. They can practice **questions tailored to their resume** and the company’s area of business while receiving **real-time feedback** on their responses.

## Functional Requirements
### Must-Have:
- **User Authentication**:  
  - As a user, I want to **sign up/login** using **email/password** or **third-party authentication (Google, GitHub)**.  
- **Profile Management**:  
  - As a user, I want to **manage my profile**, including **name, role, experience level, area of expertise**, etc.  
- **Resume Analysis**:  
  - As a user, whether an **interviewee uploading my resume** to practice or an **interviewer uploading a candidate's resume** to prepare questions, I want the **AI to analyze the resume** and generate **relevant technical interview questions**.  
- **Custom Question Selection**:  
  - As a user, I want to **choose which AI-generated technical question(s) to answer**.  
- **Response Format Flexibility**:  
  - As a user, I want to **respond to interview questions using either voice or text**, so that I can practice **communication skills in different formats**.  
- **Instant AI Feedback**:  
  - As a user, I want to **receive instant feedback** on my responses, so that I can **improve my interview performance**.  
- **Follow-up Questioning**:  
  - As a user, I want the **AI to ask follow-up questions based on my responses**, simulating a **real interview experience**.  
- **Question Type Selection**:  
  - As a user, I want to **choose the type of questions** I want to practice (**technical, behavioral, system design**) to **prepare effectively** for my target interviews.  
- **Review Past Sessions**:  
  - As a user, I want to **review my past interview sessions**, so that I can **analyze my responses and identify areas for improvement**.  
- **Favorite Questions**:  
  - As a user, I want to **add some interview questions to “Favorites”**, so I can **review them later** if they are **likely to appear in an actual interview**.  

### Nice-to-Have:
- **AI Interview Avatar**:  
  - As a user, I want an **AI-powered avatar** to conduct the interview, so that the experience **feels more natural and engaging**.  
- **Live Coding Challenges**:  
  - As a user, I want to **participate in live coding challenges**, so I can **prepare for technical interviews more effectively**.  
- **Personalized Training Plan**:  
  - As a user, I want the **AI to generate a personalized interview training plan**, so that I can **focus on improving my weakest areas**.  
- **Behavioral Analysis**:  
  - As a user, I want the **AI to analyze behavioral aspects** such as **confidence, conciseness, and professional tone** in my responses to **improve my communication skills**.  
- **Video Response Feedback**:  
  - As a user, I want the **AI to analyze my video response** and give feedback on **body language, expressions, and speaking tone/pace**.  
- **Multi-Language Support**:  
  - As a user, I want to **practice interview questions in multiple languages**, so that I can **prepare for global interviews**.  
- **Calendar Sync**:  
  - As a user, I want to **sync my interview preparation schedule with Google Calendar or Outlook**, so I can **receive reminders** and follow a **structured preparation plan**.  
- **AI-Generated Ideal Answers**:  
  - As a user, I want to **see an AI-generated ideal answer after answering a question**, so I can **compare my response and learn how to improve it**.  


## Software Architecture & Technology Stack
### **Software Architecture**
This project is a **web application** that follows a **client-server architecture**.  
- **Frontend**: Built using **React with TypeScript**.  
- **Backend**: Developed using **Flask with Python**.  
- **Communication**: Uses a **RESTful API** for a modular and scalable design.  

### **Technology Stack**  
#### **Programming Languages**
- **TypeScript (Frontend)** – Provides **static typing** and **improved maintainability** in React.  
- **Python (Backend)** – Offers **flexibility and strong library support** for AI/ML and API development.  

#### **Frontend**
- **React (with TypeScript)** – A **modern JavaScript library** for building **interactive UI components**.  
- **Tailwind CSS** – A **utility-first CSS framework** for rapid and **responsive UI development**.  

#### **Backend**
- **Flask** – A **lightweight Python web framework** for building APIs.  
- **LangChain** – A framework for integrating **language models** into the application.  

#### **Database**
- **PostgreSQL** – A **powerful, scalable relational database** with support for **advanced querying and indexing**.  

## Similar Existing Apps
### **Interview with AI**
- This application creates a **personalized interview preparation roadmap** for a job description.
- While it **tailors interview prep** to a specific job, it **lacks customizability** in generating questions **based on a user's resume**.

### **Faltah Interview Simulator**
- Analyzes users' CVs and **simulates mock interviews**.
- Provides **detailed personality/skills reports**.
- However, **lacks deep customization** in **resume-based interview questions**.

### **Job Interview Coach**
- Allows **interview planning via calendar UI**.
- Users can **schedule an AI mock interview on a specific date**.
- However, **lacks resume-based interview features**.

### **Interviews By AI**
- Generates interviews based on **user-provided prompts**.
- Takes in user responses and **suggests better answers**.
- **Does not support resume-based question generation**.