Software Requirement Specification
==================================

### Problem Statement 

In today's competitive job market, interviews are a crucial hurdle for candidates across a wide range of industries---including computer science, business, consulting, and more. Preparing for these interviews is often a challenging process. Traditional preparation methods---such as practicing random technical or case problems, reading interview guides, or scheduling mock sessions with peers---tend to lack personalization and meaningful feedback.

Many candidates struggle to identify their weaknesses, enhance their problem-solving skills, and build the confidence necessary to excel during interviews. Furthermore, real-world interview scenarios typically involve a blend of technical, situational, and behavioral questions that require a structured approach to preparation---one that closely simulates actual interview conditions.

Without a personalized and interactive preparation tool, candidates across various fields may find themselves unprepared for the specific challenges of their interviews, ultimately leading to missed opportunities in securing the positions they aspire to.

### Proposed Solution 

The proposed AI-powered mock interview app solves this problem by giving a resume-based, interactive interview experience that fits each user's background and skills. Users can upload their resumes. The AI will look at their skills and make custom technical and behavioral questions based on their experience. The app lets users answer questions using text or voice, mimicking real interview scenarios. It also gives AI-based feedback right away on correctness, clarity, and communication skills.

To make preparation better, the app has:

-   Automatic scoring and feedback to show strengths and weaknesses.

-   Follow-up questions to simulate real interviewer interactions.

-   Performance tracking and personal study tips to help users get better over time.

By offering on-demand, data-driven, and AI-enhanced interview preparation, this solution helps candidates refine their responses, boost their confidence, and maximize their chances of success in real technical interviews.

### Potential Clients

Interviewees: These are people who may be practicing for potential interviews, both behavioral and technical. They would be able to practice questions tailored to their resume and the company's area of business while receiving feedback on their responses.

Functional Requirements 

Must-Have: 

1.  As a user, I want to sign up/login in using email/password or third-party authentication (Google, Github), so that I can easily access my interview preparation account.

2.  As a user, I want to have a profile page, where I can upload my resume to generate my profile and also manually edit any fields, including name, role, past experience, area of expertise, etc, so that the app can tailor my interview sessions to my background.

3.  As a user, I want to upload my resume to the app, so that AI can analyze my resume for my profile data (name, experience level, area of expertise, etc) and generate some relevant technical/behavioral interview questions for me.

4.  As a user, I want the AI to provide an overall score for the interview according to some rubric, so that I can keep track of my improvement quantitatively.

5.  As a user, I want to respond to interview questions using either voice or text, so that I can practice my communication skills in different formats.

6.  As a user, I want to receive feedback on my responses by requesting it using a designated button, so that I can improve my interview performance.

7.  As a user, I want the AI to ask follow-up questions based on my responses, so that I can simulate a real interview experience.

8.  As a user, I want to choose the type of questions I want to practice (technical, behavioral, system design), so that I can prepare effectively for my target interviews.

9.  As a user, I want to review my past interview sessions, so that I can analyze my responses and identify areas for improvement.

10. As a user, I want to add some interview questions to "Favorites", so that I can easily revisit questions I believe are likely to appear in actual interviews.

11. As a user, I want the AI to generate a personalized interview training plan, so that I can focus on improving my weakest areas.


Nice-to-Have: 

1.  As a user, I want to sync my interview preparation schedule with Google Calendar or Outlook, so that I can receive reminders and structured preparation plans leading up to my actual interviews.

2.  As a user, I want to see an AI-generated ideal answer after answering a question, so that I can compare my response and learn how to improve it.

3.  As a user, I want to practice interview questions in multiple languages, so that I can prepare for interviews in different regions and companies that require various language skills.

4.  As a user, I want the AI to analyze my video responses for body language, facial expressions, speaking tone, and pace, and evaluate behavioral aspects like confidence, conciseness, and professionalism, so that I can improve my communication skills for real interviews.

Won't-Have:

1.  As a user, I want to participate in live coding challenges, so that I can prepare for technical interviews more effectively.

2.  As a user, I want an AI-powered avatar to conduct the interview, so that the experience feels more natural and engaging.

### Similar Existing Apps 

### [Interview with AI](https://interviewwith.ai/)

This application creates a personalized interview preparation roadmap for the job description you pasted, see what you need to learn, solve quizzes, practice with AI like an actual online interview, and get feedback at the end.

While this application does have the features of interview preparation specified to a specific job, it doesn't have the intricacy and  customizability our application provides by providing personalized interview questions based on the user's resume.

### [Faltah Interview Simulator](https://faltah.ai/)

The application has features of both going through and analyzing the user's CV and simulating mock interviews for users. They also have extremely well presented personality/skills reports.

Similar to the previous AI interviewer, while this app lacks the intricacy and customizability our application provides by providing personalized interview questions based on the user's resume.

### [Job Interview Coach](https://jobinterview.coach/)

This application has the features of planning interviews (Through a calendar UI), selecting/scheduling the interview on the exact date and AI will mock the interview on the specific date. Streamlining the entire interview process.

However, this app lacks the resume features and lacks the feature in which our app can have interviews specified to a job and the user.

### [Interviews By AI ](https://interviewsby.ai/)

This app allows users to enter a prompt and will generate an interview based on the prompt. They will also take in user responses, analyze the response, and generate a better response based on the user input.\
Again, this app lacks the resume features and lacks the feature in which our app can have interviews specified to the user.

### Software Architecture & Technology Stack

Below is the updated Markdown document outlining the Software Architecture and Technology Stack, with Poetry mentioned as a dependency in the backend:

---

# Software Architecture & Technology Stack

## Software Architecture

This project is a web application that follows a client-server architecture. The frontend is built using React with TypeScript, while the backend is developed using Flask with Python. The application communicates via a RESTful API to ensure a modular and scalable design.

## Technology Stack

### Programming Languages

- **TypeScript (Frontend):** Provides static typing and improved maintainability in React.
- **Python (Backend):** Offers flexibility and strong library support for AI/ML and API development.

### Frontend

- **React (with TypeScript):** A modern JavaScript library for building interactive UI components.
- **Vite with React:** Utilized as a fast build tool and development server for an enhanced development experience.
- **Tailwind CSS:** A utility-first CSS framework for rapid and responsive UI development.

### Backend

- **Flask:** A lightweight Python web framework for building APIs.
- **LangChain:** A framework for integrating language models into the application.
- **Poetry:** Used for managing Python dependencies, ensuring a consistent environment across both macOS and Windows.

### Database

- **PostgreSQL:** A powerful, scalable relational database with support for advanced querying and indexing.

---