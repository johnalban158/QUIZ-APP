-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'NURSE', 'CAREGIVER');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('HOME_HEALTH_AIDE', 'PERSONAL_CARE_AIDE', 'COMPANION_RESPITE_AIDE');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "QuestionMedia" AS ENUM ('AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'NURSE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "specialty" "Specialty",

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "role" "Role",
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL DEFAULT '',
    "sourceDocumentUrl" TEXT,
    "youtubeUrl" TEXT,
    "youtubeVideoId" TEXT,
    "videoRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleEligibility" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "specialty" "Specialty" NOT NULL,

    CONSTRAINT "ModuleEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffModuleAssignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,

    CONSTRAINT "StaffModuleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffModuleCompletion" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffModuleCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "mediaUrl" TEXT,
    "mediaType" "QuestionMedia",
    "mediaPublicId" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "takerName" TEXT NOT NULL,
    "takerEmail" TEXT,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeTakenSeconds" INTEGER,
    "staffMemberId" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "SubmissionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleVideoWatch" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchSeconds" INTEGER,

    CONSTRAINT "ModuleVideoWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BugReport_createdAt_idx" ON "BugReport"("createdAt");

-- CreateIndex
CREATE INDEX "ModuleEligibility_specialty_idx" ON "ModuleEligibility"("specialty");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleEligibility_moduleId_specialty_key" ON "ModuleEligibility"("moduleId", "specialty");

-- CreateIndex
CREATE INDEX "StaffModuleAssignment_staffId_idx" ON "StaffModuleAssignment"("staffId");

-- CreateIndex
CREATE INDEX "StaffModuleAssignment_moduleId_idx" ON "StaffModuleAssignment"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffModuleAssignment_staffId_moduleId_key" ON "StaffModuleAssignment"("staffId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffModuleCompletion_submissionId_key" ON "StaffModuleCompletion"("submissionId");

-- CreateIndex
CREATE INDEX "StaffModuleCompletion_staffId_idx" ON "StaffModuleCompletion"("staffId");

-- CreateIndex
CREATE INDEX "StaffModuleCompletion_moduleId_idx" ON "StaffModuleCompletion"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffModuleCompletion_staffId_moduleId_key" ON "StaffModuleCompletion"("staffId", "moduleId");

-- CreateIndex
CREATE INDEX "Submission_staffMemberId_idx" ON "Submission"("staffMemberId");

-- CreateIndex
CREATE INDEX "ModuleVideoWatch_staffId_idx" ON "ModuleVideoWatch"("staffId");

-- CreateIndex
CREATE INDEX "ModuleVideoWatch_moduleId_idx" ON "ModuleVideoWatch"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleVideoWatch_staffId_moduleId_key" ON "ModuleVideoWatch"("staffId", "moduleId");

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEligibility" ADD CONSTRAINT "ModuleEligibility_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleAssignment" ADD CONSTRAINT "StaffModuleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleAssignment" ADD CONSTRAINT "StaffModuleAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleAssignment" ADD CONSTRAINT "StaffModuleAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleCompletion" ADD CONSTRAINT "StaffModuleCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleCompletion" ADD CONSTRAINT "StaffModuleCompletion_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleCompletion" ADD CONSTRAINT "StaffModuleCompletion_staffId_moduleId_fkey" FOREIGN KEY ("staffId", "moduleId") REFERENCES "StaffModuleAssignment"("staffId", "moduleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffModuleCompletion" ADD CONSTRAINT "StaffModuleCompletion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAnswer" ADD CONSTRAINT "SubmissionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAnswer" ADD CONSTRAINT "SubmissionAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAnswer" ADD CONSTRAINT "SubmissionAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleVideoWatch" ADD CONSTRAINT "ModuleVideoWatch_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleVideoWatch" ADD CONSTRAINT "ModuleVideoWatch_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
