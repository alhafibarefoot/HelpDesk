using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using HelpDesk.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Infrastructure.Persistence;

public class ApplicationDbContextInitialiser
{
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;
    private readonly HelpDeskDbContext _context;

    public ApplicationDbContextInitialiser(ILogger<ApplicationDbContextInitialiser> logger, HelpDeskDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            if (_context.Database.IsSqlServer())
            {
                await _context.Database.MigrateAsync(); // Auto-migration
            }
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the database.");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        // Default roles/users - Fresh seeding with proper BCrypt hashing
        if (!_context.Users.Any())
        {
            // Create System Admin
            var admin = new User
            {
                FullName = "System Admin",
                Email = "admin@helpdesk.com",
                Role = UserRole.Admin,
                Department = "IT",
                Created = DateTime.UtcNow
            };
            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
            _context.Users.Add(admin);

            // Create Test Admin (originally test@test.com now with Admin role)
            var testAdmin = new User
            {
                FullName = "Test Admin",
                Email = "test@test.com",
                Role = UserRole.Admin,
                Department = "IT",
                Created = DateTime.UtcNow
            };
            testAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("test1234");
            _context.Users.Add(testAdmin);

            // Create Regular Employee
            var employee = new User
            {
                FullName = "John Doe",
                Email = "user@helpdesk.com",
                Role = UserRole.Employee,
                Department = "HR",
                Created = DateTime.UtcNow
            };
            employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123");
            _context.Users.Add(employee);

            await _context.SaveChangesAsync(CancellationToken.None);
        }

        // Default Services
        if (!_context.Services.Any())
        {
             var services = new List<Service>
             {
                 new Service
                 {
                     Name = "Technical Support",
                     ServiceKey = "IT_SUPPORT",
                     Description = "Hardware, software, and network assistance",
                     Icon = "Monitor",
                     OwningDepartment = "IT",
                     DefaultSlaHours = 4,
                     IsActive = true,
                     Status = ServiceLifecycleStatus.Active,
                     FormSchema = "{}"
                 },
                 new Service
                 {
                     Name = "Software Request",
                     ServiceKey = "SW_REQUEST",
                     Description = "Request license or installation for new software",
                     Icon = "Code",
                     OwningDepartment = "IT",
                     DefaultSlaHours = 24,
                     IsActive = true,
                     Status = ServiceLifecycleStatus.Active,
                     FormSchema = "{}"
                 },
                 new Service
                 {
                     Name = "Access Request",
                     ServiceKey = "ACCESS_REQ",
                     Description = "System, folder, or VPN access permissions",
                     Icon = "Key",
                     OwningDepartment = "Security",
                     DefaultSlaHours = 8,
                     IsActive = true,
                     Status = ServiceLifecycleStatus.Active,
                     FormSchema = "{}"
                 },
                 new Service
                 {
                     Name = "HR General Inquiry",
                     ServiceKey = "HR_INQUIRY",
                     Description = "General questions about HR policies and benefits",
                     Icon = "Users",
                     OwningDepartment = "HR",
                     DefaultSlaHours = 48,
                     IsActive = true,
                     Status = ServiceLifecycleStatus.Active,
                     FormSchema = "{}"
                 },
                 new Service
                 {
                     Name = "Expense Reimbursement",
                     ServiceKey = "EXPENSE_CLAIM",
                     Description = "Claim expenses incurred for business purposes",
                     Icon = "CreditCard",
                     OwningDepartment = "Finance",
                     DefaultSlaHours = 72,
                     IsActive = true,
                     Status = ServiceLifecycleStatus.Active,
                     FormSchema = "{}"
                 }
             };

             _context.Services.AddRange(services);
             await _context.SaveChangesAsync(CancellationToken.None);
        }
    }
}
