'use client';

import {
  User,
  DollarSign,
  Calendar,
  FileText,
  Hash,
  UserCheck,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';
import { getAvatarUrl } from '@/lib/utils/avatar-utils';

import { Button } from '@/components/ui/utilities/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays/dialog';
import { Badge } from '@/components/ui/data-display/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/data-display/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/layout/card';

import { BaseSalary } from '../types';
import { useRouter } from 'next/navigation';

interface BaseSalaryDetailModalProps {
  baseSalary: BaseSalary;
  open: boolean;
  onClose: () => void;
}

export function BaseSalaryDetailModal({
  baseSalary,
  open,
  onClose,
}: Readonly<BaseSalaryDetailModalProps>) {
  const router = useRouter();

  // Generate avatar URL using avatar-utils
  const avatarUrl = getAvatarUrl(
    baseSalary.employee?.photo_profile,
    baseSalary.employee?.avatar_url
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <DollarSign className='h-5 w-5' />
            Base Salary Details
          </DialogTitle>
          <DialogDescription>
            View base salary information and compensation details
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* 
            Header Card - Employee profile summary
            Displays avatar, name, username, and status badges in a clean horizontal layout
            Consistent with the main detail page design but optimized for modal space
          */}
          <Card className='border-1'>
            <CardContent className='p-6'>
              <div className='flex items-center space-x-4'>
                <Avatar className='h-16 w-16 ring-2 ring-border'>
                  <AvatarImage
                    src={avatarUrl}
                    alt={baseSalary.employee?.name || 'Unknown Employee'}
                  />
                  <AvatarFallback className='text-lg bg-muted'>
                    <User className='h-8 w-8' />
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                  <h3 className='text-xl font-semibold'>
                    {baseSalary.employee?.name || 'Unknown Employee'}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    @{baseSalary.employee?.username || 'unknown'}
                  </p>
                  <div className='flex items-center gap-2 mt-2'>
                    <Badge
                      variant={
                        baseSalary.status === 'ACTIVE' ? 'active' : 'draft'
                      }
                      className='text-xs'
                    >
                      {baseSalary.status}
                    </Badge>
                    <Badge variant='outline' className='font-mono text-xs'>
                      #{baseSalary.id}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 
            Information Grid - Two-column layout for salary and employee information
            Left column: Salary details with compensation information
            Right column: Employee-related information
            Uses consistent icon + label + value pattern for easy scanning
          */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Salary Information Card */}
            <Card className='border-1'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Salary Information
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0 space-y-3'>
                <div className='flex items-center gap-3'>
                  <DollarSign className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Basic Salary
                    </p>
                    <p className='text-sm font-medium text-primary'>
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(baseSalary.basic_salary)}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Calendar className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Effective Date
                    </p>
                    <p className='text-sm font-medium'>
                      {format(
                        new Date(baseSalary.effective_date),
                        'MMM dd, yyyy'
                      )}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  {baseSalary.status === 'ACTIVE' ? (
                    <UserCheck className='h-4 w-4 text-green-600' />
                  ) : (
                    <UserX className='h-4 w-4 text-yellow-600' />
                  )}
                  <div>
                    <p className='text-xs text-muted-foreground'>Status</p>
                    <Badge
                      variant={
                        baseSalary.status === 'ACTIVE' ? 'active' : 'draft'
                      }
                      className='text-xs mt-1'
                    >
                      {baseSalary.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Information Card */}
            <Card className='border-1'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0 space-y-3'>
                <div className='flex items-center gap-3'>
                  <User className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-xs text-muted-foreground'>Full Name</p>
                    <p className='text-sm font-medium'>
                      {baseSalary.employee?.name || 'Unknown Employee'}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Hash className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-xs text-muted-foreground'>Employee ID</p>
                    <p className='text-sm font-medium text-primary'>
                      @{baseSalary.employee?.username || 'unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 
            Notes Card - Full-width card for notes information
            Only shows if notes exist
          */}
          {baseSalary.notes && (
            <Card className='border-1'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='flex items-start gap-3'>
                  <FileText className='h-4 w-4 text-muted-foreground mt-0.5' />
                  <p className='text-sm font-medium'>{baseSalary.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 
            Administrative Information Card - Official base salary identifiers
            Displays ID, effective date, and status in a clean layout
            Uses monospace font for better readability of codes and numbers
            Consistent with the main detail page administrative section
          */}
          <Card className='border-1'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Administrative Information
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      Base Salary ID
                    </p>
                    <p className='text-sm font-mono text-primary mt-1'>
                      #{baseSalary.id}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Employee ID</p>
                    <p className='text-sm font-mono mt-1'>
                      #{baseSalary.employee.id}
                    </p>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Created At</p>
                    <p className='text-sm font-mono mt-1'>
                      {format(
                        new Date(baseSalary.created_at),
                        'MMM dd, yyyy HH:mm'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Updated At</p>
                    <p className='text-sm font-mono mt-1'>
                      {format(
                        new Date(baseSalary.updated_at),
                        'MMM dd, yyyy HH:mm'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className='flex justify-between'>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => router.push(`/finance/base-salary/${baseSalary.id}`)}
          >
            View Full Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
