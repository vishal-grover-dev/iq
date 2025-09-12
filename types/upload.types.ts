export enum EContentCategory {
  ACADEMIC = "Academic",
  INTERVIEW_STREAMS = "Interview Streams",
  COMPETITIVE_EXAM = "Competitive Exam",
  VIDEO_SUBTITLES = "Video (Subtitles)",
}

export enum EAcademicResourceType {
  TEXTBOOK = "Textbook (Learning Material)",
  PREVIOUS_YEAR_PAPER = "Previous Year Question Paper",
}

export enum EAcademicClass {
  CLASS_1 = "1",
  CLASS_2 = "2",
  CLASS_3 = "3",
  CLASS_4 = "4",
  CLASS_5 = "5",
  CLASS_6 = "6",
  CLASS_7 = "7",
  CLASS_8 = "8",
  CLASS_9 = "9",
  CLASS_10 = "10",
  CLASS_11 = "11",
  CLASS_12 = "12",
}

export enum EAcademicSubject {
  MATHEMATICS = "Mathematics",
  SCIENCE = "Science",
  ENGLISH = "English",
  HINDI = "Hindi",
  SANSKRIT = "Sanskrit",
  SOCIAL_SCIENCE = "Social Science",
  PHYSICS = "Physics",
  CHEMISTRY = "Chemistry",
  BIOLOGY = "Biology",
  COMPUTER_SCIENCE = "Computer Science",
  HISTORY = "History",
  GEOGRAPHY = "Geography",
  CIVICS = "Civics",
  ECONOMICS = "Economics",
}

export enum EEducationBoard {
  CBSE = "Central Board of Secondary Education",
  CISCE = "Council for the Indian School Certificate Examinations",
  NIOS = "National Institute of Open Schooling",
  ANDHRA_PRADESH_BSE = "Andhra Pradesh Board of Secondary Education",
  ASSAM_HSEC = "Assam Higher Secondary Education Council",
  BIHAR_SEB = "Bihar School Examination Board",
  CHHATTISGARH_BSE = "Chhattisgarh Board of Secondary Education",
  GOA_GBSHSE = "Goa Board of Secondary and Higher Secondary Education",
  GUJARAT_GSEB = "Gujarat Secondary and Higher Secondary Education Board",
  HARYANA_BSE = "Board of School Education Haryana",
  HIMACHAL_PRADESH_HPBOSE = "Himachal Pradesh Board of School Education",
  JAMMU_KASHMIR_JKBOSE = "Jammu and Kashmir State Board of School Education",
  JHARKHAND_JAC = "Jharkhand Academic Council",
  KARNATAKA_KSEEB = "Karnataka Secondary Education Examination Board",
  KERALA_KBPE = "Kerala Board of Public Examinations",
  MADHYA_PRADESH_MPBSE = "Madhya Pradesh Board of Secondary Education",
  MAHARASHTRA_MSBSHSE = "Maharashtra State Board of Secondary and Higher Secondary Education",
  MANIPUR_BSEM = "Manipur Board of Secondary Education",
  MEGHALAYA_MBOSE = "Meghalaya Board of School Education",
  MIZORAM_MBSE = "Mizoram Board of School Education",
  NAGALAND_NBSE = "Nagaland Board of School Education",
  ODISHA_BSE = "Odisha Board of Secondary Education",
  PUNJAB_PSEB = "Punjab School Education Board",
  RAJASTHAN_RBSE = "Board of Secondary Education Rajasthan",
  TAMIL_NADU_TNBSE = "Tamil Nadu State Board of School Examinations",
  TRIPURA_TBSE = "Tripura Board of Secondary Education",
  UTTAR_PRADESH_UPMSP = "Uttar Pradesh Board of High School and Intermediate Education",
  UTTARAKHAND_UBSE = "Uttarakhand Board of School Education",
  WEST_BENGAL_WBBSE = "West Bengal Board of Secondary Education",
}

export interface IAcademicUploadFormValues {
  contentCategory: EContentCategory;
  board?: EEducationBoard;
  grade?: EAcademicClass;
  subject?: EAcademicSubject;
  resourceType?: EAcademicResourceType;
  chapterNumber?: string;
  chapterName?: string;
  files: File[];
}

export type TUploadState = "idle" | "submitting" | "processing" | "completed" | "failed";

/**
 * Context required to construct storage paths for Academic uploads.
 * Used by upload services and utilities when organizing files in buckets.
 */
export interface IAcademicPathContext {
  contentCategory: EContentCategory.ACADEMIC;
  board: EEducationBoard;
  grade: EAcademicClass;
  subject: EAcademicSubject;
}

// Interview Streams types

export enum EInterviewStream {
  FRONTEND_REACT = "Front-end with React",
}

export enum EInterviewTopic {
  REACT = "React",
  JAVASCRIPT = "JavaScript",
}

export enum EInterviewIngestType {
  REPO = "Docs Repo (GitHub)",
  WEB = "Website (Crawl)",
}

export interface IInterviewIngestItem {
  topic: EInterviewTopic;
  subtopic: string; // includes predefined or user-entered value
  ingestType: EInterviewIngestType;
  url: string;
}

export interface IInterviewStreamsFormValues {
  contentCategory: EContentCategory.INTERVIEW_STREAMS;
  stream: EInterviewStream;
  items: IInterviewIngestItem[];
}
