using FluentAssertions;
using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using HelpDesk.Infrastructure.Services;
using HelpDesk.Infrastructure.Persistence;
using HelpDesk.Infrastructure.Persistence.Interceptors;
using Moq;
using Microsoft.EntityFrameworkCore;
using Xunit;
using System.Linq;

namespace HelpDesk.Tests;

public class WorkflowEngineTests
{
    private readonly HelpDeskDbContext _context;
    private readonly Mock<IConditionEvaluator> _mockEvaluator;
    private readonly Mock<ISubWorkflowEngine> _mockSubWorkflowEngine;
    private readonly IWorkflowEngine _workflowEngine;

    public WorkflowEngineTests()
    {
        var options = new DbContextOptionsBuilder<HelpDeskDbContext>()
            .UseInMemoryDatabase($"test_db_{Guid.NewGuid()}")
            .Options;

        var mockUserService = new Mock<ICurrentUserService>();
        mockUserService.Setup(x => x.UserId).Returns("test-user");

        var interceptor = new AuditableEntityInterceptor(mockUserService.Object);
        _context = new HelpDeskDbContext(options, interceptor);
        _mockEvaluator = new Mock<IConditionEvaluator>();
        _mockSubWorkflowEngine = new Mock<ISubWorkflowEngine>();
        _workflowEngine = new WorkflowEngine(_context, _mockEvaluator.Object, _mockSubWorkflowEngine.Object);
    }

    [Fact]
    public async Task ValidateWorkflowAsync_ShouldReturnValid_ForWorkflowWithSteps()
    {
        // Arrange
        var workflow = new Workflow
        {
            Id = 1,
            Name = "Test Workflow",
            Steps = new List<WorkflowStep>
            {
                new WorkflowStep { Id = 1, StepOrder = 1, Name = "Step 1", WorkflowId = 1 },
                new WorkflowStep { Id = 2, StepOrder = 2, Name = "Step 2", WorkflowId = 1 }
            }
        };

        _context.Workflows.Add(workflow);
        await _context.SaveChangesAsync();

        // Act
        var result = await _workflowEngine.ValidateWorkflowAsync(1);

        // Assert
        result.IsValid.Should().BeTrue("workflow has steps with proper order");
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateWorkflowAsync_ShouldReturnInvalid_ForWorkflowWithoutSteps()
    {
        // Arrange
        var workflow = new Workflow
        {
            Id = 1,
            Name = "Empty Workflow",
            Steps = new List<WorkflowStep>()
        };

        _context.Workflows.Add(workflow);
        await _context.SaveChangesAsync();

        // Act
        var result = await _workflowEngine.ValidateWorkflowAsync(1);

        // Assert
        result.IsValid.Should().BeFalse("workflow has no steps");
        result.Errors.Should().Contain("Workflow must have at least one step");
    }

    [Fact]
    public async Task ValidateWorkflowAsync_ShouldDetectDuplicateStepOrders()
    {
        // Arrange
        var workflow = new Workflow
        {
            Id = 1,
            Name = "Test Workflow",
            Steps = new List<WorkflowStep>
            {
                new WorkflowStep { Id = 1, StepOrder = 1, Name = "Step 1", WorkflowId = 1 },
                new WorkflowStep { Id = 2, StepOrder = 1, Name = "Step 2", WorkflowId = 1 } // Duplicate order
            }
        };

        _context.Workflows.Add(workflow);
        await _context.SaveChangesAsync();

        // Act
        var result = await _workflowEngine.ValidateWorkflowAsync(1);

        // Assert
        result.IsValid.Should().BeFalse("workflow has duplicate step orders");
        result.Errors.Should().Contain("Duplicate step order: 1");
    }
}
