# GitHub Profile Analyzer

A modern web app that analyzes a GitHub profile and presents detailed insights with clean UI, charts, and smart data processing.

Enter a GitHub username and instantly get a full breakdown of activity, repositories, and technology stack.

## Features

### Profile Overview
- avatar, name, bio
- account creation date
- company and location
- followers count
- direct link to GitHub profile
- copy username button

### Repository Analytics
- total repositories
- total stars across all repos
- average stars per repository
- most used programming language
- top repository (by stars)
- paginated repository list with "load more"

### Insights
- most used language
- most successful language (by stars)
- underrated repositories detection
- language usage vs popularity comparison

### Advanced Stats
- fork vs original repository ratio
- total open issues
- last activity (based on recent events)
- repositories created per year

### Charts
- language distribution (doughnut chart)
- top repositories by stars (bar chart)
- yearly activity (line chart)

### UX Improvements
- debounced search input
- localStorage caching with TTL (10 minutes)
- retry logic for API requests
- skeleton loader (instead of spinner)
- smooth animations (fade/translate)
- hover effects for interactive elements
- empty states for better feedback

### Edge Case Handling
- user not found
- API rate limit exceeded
- no repositories
- missing language data fallback
- network/API failures with retry

## Tech Stack

- Vanilla JavaScript
- GitHub REST API
- Chart.js
- CSS (glassmorphism + animations)

## How it works

1. User enters a GitHub username  
2. App fetches user data and repositories from GitHub API  
3. Data is cached in localStorage (10 minutes)  
4. Statistics and insights are calculated  
5. Charts and UI are rendered  

## Purpose

This project was built as a practice project to improve:
- working with APIs
- data processing
- UI/UX design
- handling async logic and edge cases

---
