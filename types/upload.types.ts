export enum ContentCategory {
  ACADEMIC = "Academic",
  COMPETITIVE_EXAM = "Competitive Exam",
  VIDEO_SUBTITLES = "Video (Subtitles)",
}

export enum AcademicResourceType {
  TEXTBOOK = "Textbook (Learning Material)",
  PREVIOUS_YEAR_PAPER = "Previous Year Question Paper",
}

export enum AcademicClass {
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

export enum AcademicSubject {
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

export enum EducationBoard {
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

export interface AcademicUploadFormValues {
  contentCategory: ContentCategory;
  board?: EducationBoard;
  grade?: AcademicClass;
  subject?: AcademicSubject;
  resourceType?: AcademicResourceType;
  chapterNumber?: string;
  chapterName?: string;
  files: File[];
}

export type UploadState = "idle" | "submitting" | "processing" | "completed" | "failed";
