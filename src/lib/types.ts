export type UserType = 'student' | 'parent'

export interface Student {
  username: string
  aNo: number
  aReg: string
  aName: string
  aFCnic: string
  aFname: string
  aGender: string
  aMContact: string
  aLContact: string
  aPic: string
  aCAddress: string
  aCCity: string
  city: string
  aDoa: string
  aNationality: string
  aProgramId: number
  admId: number
  admTitle: string
  aDisciplineId: number
  aDisciplineSid: number
  disciplineTitle: string
  disciplineSTitle: string
  pTitle: string
  secNo: number
  secId: string
  sessionId: number
  aSessionId: number
  campId: string
  campTitle: string
  campCompanyId: number
  projectTitle: string
  regionId: number
  zoneId: number
  aClassId: number
  isConfirm: number
  parentPortalPassword: string
  studentPortalPassword: string
  parentPortalStatus: number
  studentPortalStatus: number
  parentPortalFirstLogin: number
  studentPortalFirstLogin: number
}

export interface SessionUser {
  user: Student
  users: Student[]
  userType: UserType
  token: string
  tokenExp: number
  refresh: string
  refreshExp: number
}

export interface AttendanceSummary {
  totalPresents: number
  totalAbsents: number
  totalLeaves: number
  totalAttendance: number
}

export interface AttendanceEntry {
  attDatetime: string
  attStatus: string
}

export interface FeeSummary {
  totalFee: number
  paidFee: number
}

export interface FeeReceipt {
  feeDate: string
  feeSessionId: number
  feeNo: number
  feeReceivedAmount: number
  feeBalance: number
}

export interface Challan {
  cNo: number
  cId: string
  cRefNo: string
  cMonth: string
  cDate: string
  cDueDate: string
  cExpiryDate: string
  cANo: number
  cReg: string
  cSessionId: number
  cSectionGroup: number
  cInstallmentNo: number
  cGrandTotal: number
  feeReceivedAmount: number | null
  cPaymentDate: string | null
  bankMnemonic: string | null
  isPaid: boolean
  canViewChallan: boolean
  canPayChallan: boolean
}

export interface Lecture {
  sFName: string
  sLName: string
  sosLectureDays: string
  sosSNo: number
  subTitle: string
  sosScheduleTimeStart: string
  sosScheduleTimeEnd: string
}

export interface TimetableSection {
  secId: string
  sosScheduleRoomNumber: string
  [key: `lecture${number}`]: Lecture | undefined
}

export interface AppNotification {
  tfnId: number
  tfnTitle: string
  tfnBody: string
  tfnUserId: string
  tfnStatus: number
  tfnCreated: string
}

export interface SubjectTotal {
  subjectId: number
  subjectTitle: string
  totalMarks: number
  obtainedMarks: number
  marks: string
  percentage: number | null
}

export interface TestResults {
  testTotalMarks: number
  testObtainedMarks: number
  testResults: {
    subjects: string[]
    rows: unknown[]
    subjectTotals: SubjectTotal[]
    grandTotal: { totalMarks: number; obtainedMarks: number; percentage: number | null }
  }
}

export interface DeviceStatus {
  sfntDeviceType: string
  sfntDeviceId: string
  sfntUserId: string
  sfntSendNoticeBoardNotifications: number
  sfntSendPushNotifications: number
}

export interface RatingStatus {
  hasRated: boolean
  rating: number | null
  detail: string | null
}

export interface SubjectRef {
  subjectId: number
  subjectTitle: string
}