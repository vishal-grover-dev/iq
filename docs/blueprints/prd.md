# Intelliqent Questions (IQ) - Product Requirements Document

## Project Overview

**Project Title:** Intelliqent Questions (IQ)  
**Product Type:** RAG-powered web application for educational content generation

## Product Summary

IQ is an intelligent question generation platform that transforms educational content into structured exam papers. The system ingests textbooks and past papers, organizes them by educational board, grade level, and subject, then generates exportable exam papers with comprehensive metadata including Bloom's taxonomy classifications and difficulty assessments.

## Target Market

- **Educational Boards:** CBSE, ICSE, State Boards
- **Exam Categories:** NEET, SSC, and other competitive exams
- **Users:** Teachers, educational institutions, exam preparation centers

## Core Features

### 1. Content Ingestion & Organization

- **Document Upload:** Support for textbook and past paper uploads
- **Automatic Indexing:** Auto-categorize content by board + grade + subject
- **Vector Storage:** Store processed content in Qdrant collections for efficient retrieval

### 2. Intelligent Question Generation

- **RAG-Powered:** Generate questions grounded in source passages using Retrieval-Augmented Generation
- **Metadata Tagging:** Automatically classify questions with:
  - Bloom's Taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate, Create)
  - Difficulty levels (Easy, Medium, Hard)
- **Context-Aware:** Questions maintain relevance to source material

### 3. User Interface & Workflow

- **Selection Interface:** Choose board/grade/chapter combinations
- **Paper Pattern Generation:** Create customizable exam paper templates
- **Preview System:** Review generated papers before finalization
- **Question Management:** Review, edit, and approve individual questions
- **Export Functionality:** Generate PDF outputs for printing/distribution

## Technical Architecture

- **Frontend:** Modern web interface with intuitive UX
- **Backend:** RAG-powered question generation engine
- **Database:** Qdrant vector database for content indexing
- **Output:** PDF generation with professional formatting

## Success Metrics

- Question quality and relevance to source material
- User adoption across different educational boards
- Export quality and formatting consistency
- System performance and response times
